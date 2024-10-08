import React, { useState, useEffect } from 'react';
import { AZURE_STORAGE_WRAPPER } from '../client/AzureStorageClientWrapper';
import { BlobItem } from '@azure/storage-blob';
import '../util/ext/extensions'


interface ExistingTableRowProps {
    blobname: string, 
    blob: BlobItem
}

function ExistingBlobsTableRow({blobname, blob}: ExistingTableRowProps) {
    return (
        <tr key={blobname}>
            <td><button><i className="material-symbols-sharp">pageview</i></button></td>
            <td>{blobname}</td>
            <td>{blob?.tags?.Status ?? "unprocessed"}</td>
            <td></td>
            <td></td>
        </tr>
    )
}
  
function ExistingBlobsTable() {
    const [existingFiles, setExistingFiles] = useState<Map<string, BlobItem>>(new Map<string, BlobItem>());
    
    function loadFiles() {
        AZURE_STORAGE_WRAPPER.loadExistingInputFiles()
        .then((blobItems) => setExistingFiles(new Map(blobItems.map((blob) => [blob.name, blob]))))
    }
  
    useEffect(() => loadFiles, [])
    
    const fileRows = existingFiles.map((blobname, blob) => (<ExistingBlobsTableRow key={blobname} {...{blobname, blob}}/>))
  
    return (
        <table className='table'>
            <thead>
                <tr key="column">
                    <th></th>
                    <th>Filename</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th></th>
                </tr>
            </thead>
        <tbody>
            {fileRows}  
        </tbody>
      </table>
    )
}