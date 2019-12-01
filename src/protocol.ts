// DocumentID is just a string, could be uuid, hash, numeric, et.c.
export type DocumentID = string;

export const version = "0.5.0";

// Codes returned in index status updates
export enum IndexStatusCode {
    InSync = 72,
    StartingUp,
    Syncing,
    IncompleteShardgroup,
    IndexStatusIncompatible,
}

export function indexStatusCodeToString(code: IndexStatusCode): string {
    switch (code) {
        case IndexStatusCode.InSync:
            return "in sync";
        case IndexStatusCode.StartingUp:
            return "starting up";
        case IndexStatusCode.Syncing:
            return "syncing";
        case IndexStatusCode.IncompleteShardgroup:
            return "incomplete shard group";
        case IndexStatusCode.IndexStatusIncompatible:
            return "incompatible protocol versions";
        default:
            return `unknown (${code})`;
    }
}

// IndexStatus is regularly broadcast from all workers
export interface IndexStatus {
    IndexID: string;
    Version: string;
    DocCount: number;
    LastUpdate: Date;
    ShardgroupSize: number;
    Shardgroup: number;
    Status: IndexStatusCode;
}

// IndexUpdateRequest is a request for available updates.
// Returns up to 'Limit' document IDs, updated at or later than
// the specified document or timestamp.
export interface IndexUpdateRequest {
    Space: string;
    FromTime: Date;
    AfterDocument: DocumentID;
    Limit: number;
}

// DocumentReference corresponds to one document at one point in time
export interface DocumentReference {
    ID: DocumentID;
    Updated: Date;
}

// IndexUpdate is a list of updated documents, sent in response to
// the IndexUpdateRequest above.
export interface IndexUpdate {
    Space: string;
    Updates: DocumentReference[];
}

// Document is the representation of a searchable item
export interface Document {
    ID: DocumentID;
    Updated: Date;
    Title: string;
    Text: string;
    Alive: boolean;
}

// DocumentUpdate is sent in response to DocumentRequest
export interface DocumentUpdate {
    Space: string;
    Documents: Document[];
}

// DocumentRequest is a request for a list of documents.
// Returned documents are broadcasted to all workers.
export interface DocumentRequest {
    Space: string;
    Wanted: DocumentID[];
}

// SearchRequest is sent from a search handler to search the index.
export interface SearchRequest {
    // Spaces to search
    Spaces: string[];
    // Query string in letarette syntax
    Query: string;
    // Maximum number of hits returned in one page
    PageLimit: number;
    // Zero-indexed page of hits to retrieve
    PageOffset: number;
    // When true, spelling mistakes are "fixed"
    // and the resulting query is automatically performed.
    // In either case, spell-fixed queries are returned
    // in the SearchResult Respelt field.
    Autocorrect: boolean;
}

// SearchHit represents one search hit
export interface SearchHit {
    Space: string;
    ID: DocumentID;
    Snippet: string;
    Rank: number;
}

// SearchResult is a collection of search hits.
export interface SearchResult {
    Hits: SearchHit[];
    // When true, the search was truncated
    // Capped results are only locally sorted by rank
    Capped: boolean;
    // When not empty, the original query had no matches,
    // and this is a respelt version of the query
    Respelt: string;
    // The summed Levenshtein distance for all respelt terms
    RespeltDistance: number;
    // The total number of hits to the given query
    TotalHits: number;
}

// Codes returned in search responses
export enum SearchStatusCode {
    NoHit = 42,
    CacheHit,
    IndexHit,
    Timeout,
    QueryError,
    ServerError,
}

export function searchStatusCodeToString(code: SearchStatusCode): string {
    switch (code) {
        case SearchStatusCode.NoHit:
            return "not found";
        case SearchStatusCode.CacheHit:
            return "found in cache";
        case SearchStatusCode.IndexHit:
            return "found in index";
        case SearchStatusCode.Timeout:
            return "timeout";
        case SearchStatusCode.QueryError:
            return "query format error";
        case SearchStatusCode.ServerError:
            return "server error";
        default:
            return `unknown (${code})`;
    }
}

// SearchResponse is sent in response to SearchRequest
export interface SearchResponse {
    Result: SearchResult;
    Duration: number;
    Status: SearchStatusCode;
}
