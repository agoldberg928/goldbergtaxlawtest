export enum UploadStatus {
    PENDING = "Pending",
    UPLOADING = "Uploading",
    FAILED = "Failed",
    SUCCESS = "Success"
}

export enum RunStatus {
    PROCESSING = "Processing",
    COMPLETED = "Completed",
    FAILED = "Failed"
}

export enum AnalyzeStage {
    UPLOADING = "Uploading Files",
    VERIFYING_DOCUMENTS = "Verifying Documents",
    EXTRACTING_DATA = "Extracting Data",
    CREATING_CSV = "Creating CSV",
    COMPLETE = "Complete"
}

export enum BlobContainerName {
    INPUT = "input",
    OUTPUT = "output"
}