import React, { IframeHTMLAttributes, useState, ChangeEvent, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom'
import { AzureStorageClientWrapper } from './client/AzureStorageClientWrapper';
import { AnalyzeStage, RunStatus, UploadStatus } from './model/enums';
import { FileStatusTable } from './react_components/FileUploadTable'
import { AnalyzeDocumentIntermediateStatus, AzureFunctionClientWrapper, DocumentStatus, FinalStatus, WriteCsvSummaryResult } from './client/AzureFunctionClientWrapper';
import "./util/custom_typings/extensions"
import { LoadingButton } from '@mui/lab';
import { CloudUpload, OpenInNew, SendAndArchiveOutlined } from '@mui/icons-material';
import { Box, Button, ButtonGroup } from '@mui/material';
import { LinearProgressWithLabel, VisuallyHiddenInput } from './react_components/CustomMuiComponents';
import { createGoogleSpreadSheet } from './googlelogin';
import { MsalProvider, AuthenticatedTemplate, useMsal, UnauthenticatedTemplate } from '@azure/msal-react';
import { AnalyzeDocumentsProgressModel } from './react_components/AnalyzeDocumentProgressModal';
import { IPublicClientApplication } from '@azure/msal-browser';
import { loginRequest } from './auth/authConfig';

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
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | undefined>(undefined);
  const [statementKeys, setStatementKeys] = useState<string[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState<string | undefined>(undefined)
  const [viewing, setViewing] = useState<PdfView | undefined>(undefined)

  const msal = useMsal()
  const activeAccount = msal.instance.getActiveAccount();

  const functionWrapperRef = useRef(new AzureFunctionClientWrapper(process.env.REACT_APP_AZURE_FUNCTION_BASE_URL!, msal))
  const AZURE_FUNCTION_WRAPPER = functionWrapperRef.current

  const storageWrapperRef = useRef(new AzureStorageClientWrapper(AZURE_FUNCTION_WRAPPER, process.env.REACT_APP_STORAGE_ACCOUNT!))
  const AZURE_STORAGE_WRAPPER = storageWrapperRef.current

  const handleRedirect = () => {
      // @ts-ignore
      msal.instance.loginRedirect({...loginRequest, prompt: 'create',})
          .catch((error) => console.log(error));
  };
  

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
    if (pendingFiles.size === 0 || processingStatus) return;

    const newSelectedFiles = new Map(selectedFiles)
    pendingFiles.forEach((file, filename) => {
        file.uploadStatus = UploadStatus.UPLOADING
        newSelectedFiles.set(filename, file)
    })
    unstable_batchedUpdates(() =>{
      setProcessingStatus({stage: AnalyzeStage.UPLOADING});
      setSelectedFiles(newSelectedFiles)
    })

    const uploadFailures = new Map<string, any>()
    const promises = pendingFiles.map(async (filename, file) => {
      try {
        await AZURE_STORAGE_WRAPPER.uploadFile(file);
        console.log(`${filename} finished uploading with SUCCESS`);
        file.uploadStatus = UploadStatus.SUCCESS;
        file.statusMessage = undefined;
        setSelectedFiles(selectedFiles.update(filename, file));
      } catch (error: any) {
        console.log(`${filename} finished uploading with FAILED: ${error}`);
        uploadFailures.set(filename, error)
        file.uploadStatus = UploadStatus.FAILED;
        file.statusMessage = error.message;
        setSelectedFiles(selectedFiles.update(filename, file));
      }
    })

    await Promise.all(promises).then((values) => {
      console.log(`Finished uploading all files: ${values}`)  
      setProcessingStatus({stage: AnalyzeStage.VERIFYING_DOCUMENTS});
    })

    if (uploadFailures.size > 0) {
      alert(uploadFailures.map((filename, error) => `${filename} finished uploading with FAILED: ${error}`))
      setProcessingStatus(undefined);
      return
    }

    const statements = await analyzeDocuments()
    if (statements.length > 0) {
      try {
        const csvSummaryFiles = await AZURE_FUNCTION_WRAPPER.writeCsv(statements)
        const csvFiles = await AZURE_STORAGE_WRAPPER.loadCsvFiles(csvSummaryFiles)
        setSpreadsheetId(await createGoogleSpreadSheet(csvFiles))
      } catch(error) {
        alert(`Failed to create csv file: ${error}`)
      }
    }
    setProcessingStatus(undefined)
  };

  async function analyzeDocuments(): Promise<string[]> {
    const uploadedFiles: Map<string, File> = selectedFiles.filter((_, file)=> file.uploadStatus === UploadStatus.SUCCESS && file.runStatus != RunStatus.COMPLETED)
    uploadedFiles.forEach((file, _) => {
      file.runStatus = RunStatus.PROCESSING
      file.pagesAnalyzed = undefined
      file.totalPages = undefined
    });
    setSelectedFiles(new Map(selectedFiles))
    
    try {
      const statements = await AZURE_FUNCTION_WRAPPER.analyzeDocuments([...uploadedFiles.keys()], updateStatus)
      setStatementKeys(statements)
      console.log(`final result: ${statements}`)
      uploadedFiles.forEach((file, _) => file.runStatus = RunStatus.COMPLETED);
      unstable_batchedUpdates(() =>{
        setProcessingStatus({stage: AnalyzeStage.CREATING_CSV})
        setSelectedFiles(new Map(selectedFiles))
      })
      return statements
    } catch(e: any) {
      console.log(e)
      uploadedFiles.forEach((file, _) => file.runStatus = RunStatus.FAILED);
      unstable_batchedUpdates(() =>{
        setProcessingStatus(undefined)
        setSelectedFiles(new Map(selectedFiles))
      })
      alert(`Analyze Documents Failed: ${e}`)
      return []
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
          setProcessingStatus({stage: status.stage as AnalyzeStage, lastStatus: status})
          setSelectedFiles(new Map(selectedFiles))
        })
      }
  }

  return (
    <div>
      <AuthenticatedTemplate>
        <div>Welcome {activeAccount?.username} <Button onClick={() => msal.instance.logoutRedirect({account: activeAccount, postLogoutRedirectUri: process.env.REACT_APP_AZURE_FUNCTION_BASE_URL})}>Sign out</Button></div>
        <div>
          <h2>Analyze Documents</h2>
          
          <ButtonGroup variant='contained'>
            {/* File Input + Label */}
            <Button
              color='secondary'
              disabled={processingStatus !== undefined}
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
              disabled={processingStatus !== undefined || selectedFiles.size == 0}
              loading={processingStatus !== undefined}
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
                // <AnalyzeDocumentsProgressModel open={true} files={selectedFiles} status={processingStatus}/>
                <LinearProgressWithLabel value={processingStatus.lastStatus ? (processingStatus.lastStatus?.pagesCompleted / processingStatus.lastStatus?.totalPages * 100) : 0} description={processingStatus.stage ?? processingStatus.lastStatus?.stage}/>
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
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
          <Button className="signInButton" onClick={handleRedirect} color='primary' variant="contained"> Sign in </Button>
      </UnauthenticatedTemplate>
    </div>
  );
};

export function MSalWrapper({instance}: any) {
  return (
    <MsalProvider instance={instance}>
      <FileUploadApp />
    </MsalProvider>
  )
}