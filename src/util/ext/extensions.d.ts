import { RunStatus, UploadStatus } from "../../model/enums"
declare global {
    interface Map<K, V> {
        map<T>(mapperFunc: (key: K, value: V) => T): Array<T>
        filter(mapperFunc: (key: K, value: V) => boolean): Map<K, V>
        remove<K>(key: K): Map<K, V>
        update<K>(key: K, value: V): Map<K, V>
    }

    interface Array<T> {
        toMap<K, V>(): Map<K, V>
    }

    interface File {
        uploadStatus: UploadStatus
        runStatus: RunStatus | undefined
        pagesAnalyzed: number | undefined
        totalPages: number | undefined
        statusMessage: string | undefined
    }

    interface FileList {
        forEach(mapperFunc: (file: File, idx: number) => void)
    }
}

export {}