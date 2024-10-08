import { BlobContainerName } from "../model/enums"
import { CookieKey, getCookie, setCookie } from "./cookieClient"

export class AzureFunctionClientWrapper {
    private analyzeDocumentEndpoint: string
    private fetchSasTokenEndpoint: string
    private writeCsvSummaryEndpoint: string
    
    constructor(clientEndpoint: string) {
        this.analyzeDocumentEndpoint = clientEndpoint.concat(AzureFunctionClientWrapper.ANALYZE_DOCUMENT_ENDPOINT_SUFFIX)
        this.fetchSasTokenEndpoint = clientEndpoint.concat(AzureFunctionClientWrapper.FETCH_SAS_TOKEN_ENDPOINT_SUFFIX)
        this.writeCsvSummaryEndpoint = clientEndpoint.concat(AzureFunctionClientWrapper.WRITE_CSV_SUMMARY_ENDPOINT_SUFFIX)
    }

    async retrieveSasToken(action: BlobContainerName): Promise<string> {
        const cookieKey = CookieKey.forBlobContainer(action)
        return getCookie(cookieKey) ?? await this.fetchNewSasToken(action, cookieKey)
    }

    private async fetchNewSasToken(action: BlobContainerName, cookieKey: CookieKey): Promise<string> {
        const searchParams = new URLSearchParams({
            token: "pleasegivemeatoken", // TODO: replace this with some kind of sign in
            action: action
        })
        
        try {
            const response = await fetch(`${this.fetchSasTokenEndpoint}?${searchParams}`, { method: "GET" });
            const token = (await response.json()).token;
    
            setCookie(cookieKey, token, AzureFunctionClientWrapper.SAS_TOKEN_EXPIRY_SECONDS);
    
            return token;
        } catch (error: any) {
            // TODO: what to do if we don't have a SAS token?  Probably should retry/break the page
            console.error("Error fetching the SAS token:", error);
            throw Error(error.message)
        }
    }

    async analyzeDocuments(filenames: string[], pollerFunc: (status: AnalyzeDocumentIntermediateStatus) => void): Promise<string[]> {
        const statusQueryURL = await this.initAnalyzeDocuments(filenames)
        return this.pollForStatus(statusQueryURL, pollerFunc)
    }

    private async initAnalyzeDocuments(filenames: string[]): Promise<string> {
        try {
            const response = await fetch(this.analyzeDocumentEndpoint, { 
                method: "POST",
                body: JSON.stringify({
                    documents: filenames,
                    overwrite: true
                })
            });
            return (await response.json()).statusQueryGetUri;
        } catch (error: any) {
            // TODO: Probably should alert with error message
            console.error("Error calling initAnalyzeDocuments:", error);
            throw Error(`initAnalyzeDocuments failed with input [${filenames}]: ${error}`)
        }

        
    }

    async pollForStatus(statusQueryURL: string, pollerFunc: (status: AnalyzeDocumentIntermediateStatus) => void) {
        // TODO: poll for document status
        let currentRunningStatus: RuntimeStatus
        let statusInfo: AnalyzeDocumentStatus
        do {
            await wait(3000)
            statusInfo = await this.getAnalyzeDocumentStatus(statusQueryURL)
            console.log(`current status: ${JSON.stringify(statusInfo)}`)
            currentRunningStatus = statusInfo.runtimeStatus
            pollerFunc(statusInfo.customStatus)
            if ((new Date(statusInfo.lastUpdatedTime).valueOf() + AzureFunctionClientWrapper.POLLING_TIMEOUT_PERIOD_MS) < new Date().valueOf()) {
                const message = `[${statusQueryURL}] Function appears to be stuck as it has not updated in 5 minutes.  Please check the run ID for more details`
                console.log(message)
                throw Error(message)
            }
            // TODO: check for last updated time and throw an error message
        } while (currentRunningStatus === RuntimeStatus.RUNNING)
        
        if (statusInfo.runtimeStatus == RuntimeStatus.COMPLETED && statusInfo.output.status == FinalStatus.SUCCESS) {
            return statusInfo.output.result
        } else if (statusInfo.runtimeStatus == RuntimeStatus.COMPLETED && statusInfo.output.status == FinalStatus.FAILED) {
            const message = `[${statusQueryURL}] Analyze Document function return FAILED status: ${statusInfo.output.errorMessage}`
            console.log(message)
            throw Error(message)
        } else {
            const message = `[${statusQueryURL}] Analyze Document function failed to complete.  Please check the runId for more details. Last known status: ${JSON.stringify(statusInfo)}.`
            console.log(message)
            throw Error(message)
        }
    }

    async getAnalyzeDocumentStatus(statusQueryUrl: string): Promise<AnalyzeDocumentStatus> {
        try {
            const response = await fetch(statusQueryUrl, { method: "GET"});
            
            return await response.json()
        } catch(err: any) {
            // TODO: what to do if this fails? Should probably return a default failure object/retry
            console.error(err)
            throw Error(`[${statusQueryUrl}] GetAnalyzeDocumentStatus failed: ${err}`)
        }
    }

    async writeCsv(statements: string[]): Promise<WriteCsvSummaryResult> {
        try {
            const response = await fetch(this.writeCsvSummaryEndpoint, { 
                method: "POST",
                body: JSON.stringify({
                    statementKeys: statements,
                    outputDirectory: "reacttest",
                })
            });
            const result = await response.json() as WriteCsvSummaryResult
            if (result.status == FinalStatus.SUCCESS) {
                return result;
            } else {
                throw Error(result.errorMessage)
            }
        } catch (error: any) {
            // TODO: Probably should alert with error message
            console.error("Error calling WriteCsvSummary:", error);
            throw Error(`writeCsvSummary failed with input [${statements}]: ${error}`)
        }
    }



    

    private static ANALYZE_DOCUMENT_ENDPOINT_SUFFIX = "/api/InitAnalyzeDocuments"
    private static FETCH_SAS_TOKEN_ENDPOINT_SUFFIX = "/api/RequestSASToken"
    private static WRITE_CSV_SUMMARY_ENDPOINT_SUFFIX = "/api/WriteCsvSummaryFunction"
    
    private static SAS_TOKEN_EXPIRY_SECONDS = 60 * 15  // 15 minutes
    private static POLLING_TIMEOUT_PERIOD_MS = 1000 * 60 * 2  // 2 minutes
} 

// TODO: verify these statuses
enum RuntimeStatus {
    PENDING = "Pending",
    RUNNING = "Running",
    COMPLETED = "Completed",
    FAILED = "Failed"
}

type AnalyzeDocumentStatus = {
    name: string
    instanceId: string
    runtimeStatus: RuntimeStatus
    customStatus: AnalyzeDocumentIntermediateStatus
    // input: {}  ignore for now
    output: AnalyzeDocumentOutput
    createdTime: Date // might have to store as string
    lastUpdatedTime: Date
}

export type AnalyzeDocumentIntermediateStatus = {
    action: string
    documents: Array<DocumentStatus>
    totalPages: number
    pagesCompleted: number
}


enum AnalyzeDocumentAction {
    VERIFYING = "Verifying",
    EXTRACTING_DATA = "Extracting Data"
}

export type DocumentStatus = {
    documentName: string
    totalPages: number
    pagesCompleted: number
}

type AnalyzeDocumentOutput = {
    status: FinalStatus
    result: string[]
    errorMessage: string
}

export enum FinalStatus {
    SUCCESS = "Success",
    FAILED = "Failed"
}

export interface WriteCsvSummaryResult {
    status: FinalStatus,
    errorMessage: string,
    checkSummaryFile: string,
    accountSummaryFile: string,
    statementSummaryFile: string,
    recordsFile: string,
}

function wait(ms: number = 1000) {
    return new Promise(resolve => { setTimeout(resolve, ms); });
};

export const AZURE_FUNCTION_WRAPPER = new AzureFunctionClientWrapper(process.env.REACT_APP_AZURE_FUNCTION_BASE_URL!)