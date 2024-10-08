import React, { IframeHTMLAttributes, useState, ChangeEvent } from 'react';
import { unstable_batchedUpdates } from 'react-dom'
import { AZURE_STORAGE_WRAPPER } from './client/AzureStorageClientWrapper';
import { AnalyzeStage, RunStatus, UploadStatus } from './model/enums';
import { FileStatusTable } from './react_components/FileUploadTable'
import { AnalyzeDocumentIntermediateStatus, AZURE_FUNCTION_WRAPPER, DocumentStatus, FinalStatus, WriteCsvSummaryResult } from './client/AzureFunctionClientWrapper';
import "./util/custom_typings/extensions"
import { LoadingButton } from '@mui/lab';
import { CloudUpload, OpenInNew, SendAndArchiveOutlined } from '@mui/icons-material';
import { Box, Button, ButtonGroup } from '@mui/material';
import { LinearProgressWithLabel, VisuallyHiddenInput } from './react_components/CustomMuiComponents';
import { createGoogleSpreadSheet } from './googlelogin';
import { AnalyzeDocumentsProgressModel } from './react_components/AnalyzeDocumentProgressModal';

export interface PdfView {
  file: File
  page: number
}

export interface ProcessingStatus {
  stage: AnalyzeStage,
  lastStatus?: AnalyzeDocumentIntermediateStatus | undefined
}

export default function FileUploadApp() {
  // map of filename to file
  const [selectedFiles, setSelectedFiles] = useState<Map<string, File>>(new Map<string, File>());
  const [uploading, setUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | undefined>(undefined);
  const [statementKeys, setStatementKeys] = useState<string[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState<string | undefined>(undefined)
  const [viewing, setViewing] = useState<PdfView | undefined>(undefined)
  

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value == null) return
    const newSelectedFiles = new Map(selectedFiles)
    e.target.files?.forEach((file, _) => {
      if (newSelectedFiles.get(file.name)?.uploadStatus === UploadStatus.SUCCESS) {
        return
      }
      newSelectedFiles.set(file.name, file)
    });
    e.target.value = ""
    setSelectedFiles(newSelectedFiles);
  };

  function handleRemoveClick(filename: string) {
    if (viewing?.file.name === filename) {
      setViewing(undefined)
    }
    setSelectedFiles(selectedFiles.remove(filename))
  }

  function handleViewClick(file: File, page: number) {
    if (viewing?.file == file && viewing?.page === page){
      setViewing(undefined)
    } else {
      setViewing({file: file, page: page})
    }
  }  

  function getObjectUrl(pdfView: PdfView): string {
    const pageSuffix = pdfView.page ? `#page=${pdfView.page}` : "";
    return URL.createObjectURL(pdfView.file).concat(pageSuffix)
  }

  async function uploadFilesToAzure() {
    const pendingFiles = selectedFiles.filter((_, file)=> file.uploadStatus === UploadStatus.PENDING)
    if (pendingFiles.size === 0 || uploading) return;

    const newSelectedFiles = new Map(selectedFiles)
    pendingFiles.forEach((file, filename) => {
        file.uploadStatus = UploadStatus.UPLOADING
        newSelectedFiles.set(filename, file)
    })
    unstable_batchedUpdates(() =>{
      setUploading(true);
      setSelectedFiles(newSelectedFiles)
    })

    const promises = pendingFiles.map(async (filename, file) => {
      try {
        const result = await AZURE_STORAGE_WRAPPER.uploadFile(file);
        console.log(`${filename} finished uploading with SUCCESS: ${result}`);
        file.uploadStatus = UploadStatus.SUCCESS;
        file.statusMessage = undefined;
        setSelectedFiles(selectedFiles.update(filename, file));
      } catch (error: any) {
        console.log(`${filename} finished uploading with FAILED: ${error}`);
        file.uploadStatus = UploadStatus.FAILED;
        file.statusMessage = error.message;
        setSelectedFiles(selectedFiles.update(filename, file));
      }
    })

    await Promise.all(promises).then((values) => {
      console.log(`Finished uploading all files: ${values}`)
      setUploading(false);
    })

    await analyzeDocuments()
    const csvSummaryFiles = await AZURE_FUNCTION_WRAPPER.writeCsv(statementKeys)
    const csvFiles = await AZURE_STORAGE_WRAPPER.loadCsvFiles(csvSummaryFiles)
    setSpreadsheetId(await createGoogleSpreadSheet(csvFiles))
  };

  async function analyzeDocuments() {
    const uploadedFiles: Map<string, File> = selectedFiles.filter((_, file)=> file.uploadStatus === UploadStatus.SUCCESS)
    uploadedFiles.forEach((file, _) => {
      file.runStatus = RunStatus.PROCESSING
      file.pagesAnalyzed = undefined
      file.totalPages = undefined
    });
    unstable_batchedUpdates(() =>{
      setProcessingStatus({stage: AnalyzeStage.UPLOADING})
      setSelectedFiles(new Map(selectedFiles))
    })
    try {
      const statements = await AZURE_FUNCTION_WRAPPER.analyzeDocuments([...uploadedFiles.keys()], updateStatus)
      setStatementKeys(statements)
      console.log(`final result: ${statements}`)
      uploadedFiles.forEach((file, _) => file.runStatus = RunStatus.COMPLETED);
      unstable_batchedUpdates(() =>{
        setProcessingStatus({stage: AnalyzeStage.CREATING_CSV})
        setSelectedFiles(new Map(selectedFiles))
      })
    } catch(e: any) {
      console.log(e)
      uploadedFiles.forEach((file, _) => file.runStatus = RunStatus.FAILED);
      unstable_batchedUpdates(() =>{
        setProcessingStatus(undefined)
        setSelectedFiles(new Map(selectedFiles))
      })
      // TODO: pop up an alert
    }
  }

  function updateStatus(status: AnalyzeDocumentIntermediateStatus) {
      status?.documents?.forEach((documentStatus: DocumentStatus) => {
        // TODO: figure out a way to normalize the names
        const documentName = documentStatus.documentName.endsWith(".pdf") ? documentStatus.documentName : documentStatus.documentName + ".pdf"
        const file = selectedFiles.get(documentName)!
        
        file.pagesAnalyzed = documentStatus.pagesCompleted
        file.totalPages = documentStatus.totalPages
      })
      if (status) {
        unstable_batchedUpdates(() =>{
          setProcessingStatus({stage: status.action as AnalyzeStage, lastStatus: status})
          setSelectedFiles(new Map(selectedFiles))
        })
      }
  }

  return (
    <div>
      <div>
        <h2>Analyze Documents</h2>
        
        <ButtonGroup variant='contained'>
          {/* File Input + Label */}
          <Button
            color='secondary'
            disabled={uploading || processingStatus !== undefined}
            component="label"
            role={undefined}
            variant="contained"
            tabIndex={-1}
            startIcon={<CloudUpload />}
          >
            Select files
            <VisuallyHiddenInput
              type="file"
              onChange={handleFileChange}
              multiple
            />
          </Button>

          <LoadingButton
            size="large"
            onClick={uploadFilesToAzure}
            endIcon={<SendAndArchiveOutlined />}
            disabled={uploading || selectedFiles.size == 0}
            loading={uploading}
            loadingPosition="end"
            variant="contained"
          >
            Analyze
          </LoadingButton>
        </ButtonGroup>

        {/* Progress Bar */}
        <Box>
          <Box>
            { processingStatus &&
              <AnalyzeDocumentsProgressModel open={true} files={selectedFiles} status={processingStatus}/>
            }
          </Box>
          <Box>
            {spreadsheetId && 
              <Button variant='contained' size='large' color='primary' endIcon={<OpenInNew />} 
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} target='_blank'>
                Open in Google Sheets
              </Button>
            }
          </Box>
        </Box>
      </div>
      <div>
        {/* Selected Files Table */}
        <h3>Selected Files</h3>
        <FileStatusTable files={selectedFiles} handleRemoveClick={handleRemoveClick} handleViewClick={handleViewClick}/>

        {/* PDF Display iFrame */}
        <div className='pdf-display-container'>
          {
            viewing && 
            <iframe id="pdfDisplay" src={getObjectUrl(viewing)!}/>
          }
          
        </div>
      </div>
    </div>
  );
};