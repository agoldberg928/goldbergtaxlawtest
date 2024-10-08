import { DataGrid, GridCellEditStopReasons, GridColDef, GridDeleteIcon, GridRowModel, GridRowsProp } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import React from 'react';
import '../util/custom_typings/extensions';
import { Button, IconButton } from '@mui/material';
import { DeleteForeverOutlined, Preview, PreviewOutlined } from '@mui/icons-material';

export function FileStatusTable({files, handleRemoveClick, handleViewClick}: FileStatusTableProps) {

    // const fileRows = files.map((filename, file) => {
    //     return (
    //         <FileStatusRow key={filename} {...{file, handleRemoveClick, handleViewClick}} />
    //     )
    // })

    const rows = files.map((filename: string, file: File) => {
        return {
            id: filename,
            file: file,
            // uploadStatus: file.uploadStatus,
            // processStatus: `${file.runStatus ?? ""} ${file.totalPages ? file.pagesAnalyzed + "/" + file.totalPages : ""}`,
            remove: filename
          }
    })

    const columns: GridColDef[] = [
        { field: 'file', headerName: 'Filename', width: 800, renderCell: (params) => {
            return (
                <span>
                    <IconButton className='view' onClick={() => handleViewClick(params.value)}><Preview /></IconButton> {params.value.name}
                </span>
            )
        } },
        // { field: 'uploadStatus', headerName: 'Upload Status', width: 160 },
        // { field: 'processStatus', headerName: 'Process Status', width: 200 },
        { field: 'remove', headerName: '', sortable: false, disableColumnMenu: true, display: 'flex', width: 50, resizable: false, renderCell: (params) => {
            return (
                <IconButton aria-label="remove" onClick={() => handleRemoveClick(params.value)}><DeleteForeverOutlined color='error' /></IconButton>
            )
        } }
      ];

    return (
        <DataGrid rows={rows} columns={columns} />
        // <table className='table'>
        // <thead>
        //     <tr key="column">
        //         <th></th>
        //         <th>Filename</th>
        //         <th>Upload Status</th>
        //         <th>Process Status</th>
        //         <th>Message</th>
        //         <th></th>
        //     </tr>
        // </thead>
        // <tbody>
        //     {fileRows}  
        // </tbody>
        // </table>
    )
}
interface FileStatusTableProps {
    files: Map<string, File>,
    handleRemoveClick: Function, 
    handleViewClick: Function
}

// function FileStatusRow({file, handleRemoveClick, handleViewClick}: FileStatusRowProps) {
//     return (
//         <tr className={file.uploadStatus} key={file.name}>
//             <td><button className='view' onClick={() => handleViewClick(file)}><i className="material-symbols-sharp">preview</i></button></td>
//             <td>{file.name}</td>
//             <td>{file.uploadStatus}</td>
//             <td>{file.runStatus ?? ""} {file.totalPages ? `${file.pagesAnalyzed}/${file.totalPages}` : ""}</td>
//             <td>{file.statusMessage}</td>
//             <td><button className='remove' onClick={() => handleRemoveClick(file.name)}>x</button></td>
//         </tr>
//     )
// }
// interface FileStatusRowProps {
//     file: File, 
//     handleRemoveClick: Function, 
//     handleViewClick: Function
// }
