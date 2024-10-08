import { BlobUploadCommonResponse, ContainerClient, BlobItem } from "@azure/storage-blob";
import { AZURE_FUNCTION_WRAPPER, AzureFunctionClientWrapper, WriteCsvSummaryResult } from "./AzureFunctionClientWrapper";
import { CookieKey, getCookie } from "./cookieClient";
import { BlobContainerName } from "../model/enums";
import { BankStatement } from "../model/statement_model";


class AzureStorageClientWrapper {
    private azureFunctionWrapper: AzureFunctionClientWrapper
    private inputContainerClient: Promise<ContainerClient>
    private outputContainerClient: Promise<ContainerClient>
    private storageAccountName: string
    constructor(functionWrapper: AzureFunctionClientWrapper, storageAccountName: string) {
        this.storageAccountName = storageAccountName
        this.azureFunctionWrapper = functionWrapper
        this.inputContainerClient = this.newClientFromSasToken(BlobContainerName.INPUT)
        this.outputContainerClient = this.newClientFromSasToken(BlobContainerName.OUTPUT)
    }

    private async getInputClient(): Promise<ContainerClient> {
        if (getCookie(CookieKey.INPUT_SAS_TOKEN)) return this.inputContainerClient
        else return this.refreshInputClient()
    }
    
    
    private async getOutputClient(): Promise<ContainerClient> {
        if (getCookie(CookieKey.INPUT_SAS_TOKEN)) return this.outputContainerClient
        else return this.refreshOutputClient()
    }

    private async refreshInputClient(): Promise<ContainerClient> {
        this.inputContainerClient = this.newClientFromSasToken(BlobContainerName.INPUT)
        return this.inputContainerClient
    }

    private async refreshOutputClient(): Promise<ContainerClient> {
        this.outputContainerClient = this.newClientFromSasToken(BlobContainerName.OUTPUT)
        return this.outputContainerClient
    }
    
    private async newClientFromSasToken(container: BlobContainerName): Promise<ContainerClient> {
        const sasToken = await this.azureFunctionWrapper.retrieveSasToken(container)
        return new ContainerClient(`https://${this.storageAccountName}.blob.core.windows.net/${container}?${sasToken}`)
    }

    async uploadFile(file: File): Promise<BlobUploadCommonResponse> {
        const blobClient = (await this.getInputClient()).getBlockBlobClient(file.name);
        return blobClient.uploadData(file)
    }

    async loadExistingInputFiles(): Promise<BlobItem[]> {
        const blobItems: BlobItem[] = []
        for await (const response of (await this.getInputClient()).listBlobsFlat({includeTags: true, includeMetadata: true}).byPage({ maxPageSize: 20 })) {
            for (const blob of response.segment.blobItems) {
                blobItems.push(blob)
            }
        }
        return blobItems
    }

    async loadBankStatements(statementKeys: string[]): Promise<BankStatement[]> {
        return Promise.all(statementKeys.map(async (link): Promise<BankStatement> => {
            const response = await (await (await this.getOutputClient()).getBlobClient(link).download()).blobBody;
            return JSON.parse(await response!.text()) as BankStatement
        }))
    }

    async loadCsvFiles(links: WriteCsvSummaryResult): Promise<CsvSummary> {
        const checkSummaryPromise = this.loadCsvFile(links.checkSummaryFile)
        const accountSummaryPromise = this.loadCsvFile(links.accountSummaryFile)
        const statementSummaryPromise = this.loadCsvFile(links.statementSummaryFile)
        const recordsPromise = this.loadCsvFile(links.recordsFile)
        return {
            checkSummary: await checkSummaryPromise,
            accountSummary: await accountSummaryPromise,
            statementSummary: await statementSummaryPromise,
            records: await recordsPromise,
        }
    }
    
    async loadCsvFile(link: string) {
        const blobResponse = (await (await this.getOutputClient()).getBlobClient(link).download())
        const blobBody = blobResponse.blobBody
        return (await blobBody)!.text()
        // return await (await (await (await this.getOutputClient()).getBlobClient(link).download()).blobBody!).text();
    }
}

export interface CsvSummary {
    checkSummary: string,
    accountSummary: string,
    statementSummary: string,
    records: string,
}

export const AZURE_STORAGE_WRAPPER = new AzureStorageClientWrapper(AZURE_FUNCTION_WRAPPER, process.env.REACT_APP_STORAGE_ACCOUNT!)