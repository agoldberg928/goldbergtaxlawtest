import { Backdrop, Dialog, Modal, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import React from "react";
import { AnalyzeDocumentIntermediateStatus } from "../client/AzureFunctionClientWrapper";
import { AnalyzeStage } from "../model/enums";
import { LinearProgressWithLabel } from "./CustomMuiComponents";
import '../util/ext/extensions'

export interface ProgressModalProps {
    open: boolean
    status: ProcessingStatus
    files: Map<string, File>
}

export interface ProcessingStatus {
    stage: AnalyzeStage,
    lastStatus?: AnalyzeDocumentIntermediateStatus | undefined
}

export function AnalyzeDocumentsProgressModel(props: ProgressModalProps) {

    const percentage = props.status.lastStatus ? props.status.lastStatus?.pagesCompleted / props.status.lastStatus?.totalPages : undefined
    const steps = Object.values(AnalyzeStage).map((stage) => {
        let progressBar
        if (stage == AnalyzeStage.EXTRACTING_DATA && percentage) {
            progressBar = <LinearProgressWithLabel value={percentage} description={props.status.stage}/>
        }
        return (
            <Step key={stage}><StepLabel>{stage}</StepLabel>
                {progressBar}
            </Step>
        )
    })

    

    const rows = props.files.map((filename: string, file: File) => {
        return {
            id: filename,
            file: filename,
            uploadStatus: file.uploadStatus,
            processStatus: `${file.runStatus ?? ""} ${file.totalPages ? file.pagesAnalyzed + "/" + file.totalPages : ""}`,
          }
    })

    const columns: GridColDef[] = [
        { field: 'file', headerName: 'Filename', width: 400},
        { field: 'uploadStatus', headerName: 'Upload Status', width: 160 },
        { field: 'processStatus', headerName: 'Process Status', width: 200 },
      ];

    return (
        <>
            <Dialog
                open={props.open}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
                fullWidth={true}
            >
                <>
                    <Box>
                        <Stepper activeStep={Object.values(AnalyzeStage).indexOf(props.status.stage)} alternativeLabel>
                            {steps}
                        </Stepper>
                    </Box>
                    <DataGrid rows={rows} columns={columns} />
                </>
            </Dialog>
        </> 
    )
}