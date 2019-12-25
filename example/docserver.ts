
import {loadRecipies} from "./recipies";

import {
    Document,
    DocumentManager,
    DocumentReference,
    DocumentRequest,
    DocumentUpdate,
    IndexUpdate,
    IndexUpdateRequest,
} from "letarette";

const recipies = loadRecipies("pg24384.txt");
let index = Object.keys(recipies);

for (const day of index) {
    const date = new Date(day);
    recipies[day].date = date;
}

index = index.sort((a, b) => {
    return (
        recipies[a].date.getTime() - recipies[b].date.getTime()
    );
});

const mgr = new DocumentManager(["nats://localhost:4222"]);
mgr.connect().then(() => {
    mgr.startIndexRequestHandler(handleIndexRequest);
    mgr.startDocumentRequestHandler(handleDocumentRequest);
})
.catch((err) => {
    console.log("Failed to connect to NATS");
    process.exit(1);
});

function handleIndexRequest(req: IndexUpdateRequest): IndexUpdate {

    if (req.Space !== "docs") {
        return {
            Space: req.Space,
            Updates: [],
        };
    }

    let updates: DocumentReference[] = [];

    if (req.AfterDocument === "") {
        updates = fetchInitial(req.Limit);
    } else {
        if (! (req.AfterDocument in recipies)) {
            updates = fetchByTime(req.FromTime, req.Limit);
        } else {
            const reference = recipies[req.AfterDocument];
            if (reference.date.getTime() > req.FromTime.getTime()) {
                // doc updated, only use time
                updates = fetchByTime(req.FromTime, req.Limit);
            } else {
                updates = fetchByReference(req.AfterDocument, req.FromTime, req.Limit);
            }
        }
    }
    return {
        Space: "docs",
        Updates: updates,
    };
}

function handleDocumentRequest(req: DocumentRequest): DocumentUpdate {
    let result: Document[] = [];

    if (req.Space === "docs") {
        result = req.Wanted.filter((id) => id in recipies).map((id): Document => {
            const recipe = recipies[id];
            return {
                ID: id,
                Updated: recipe.date,
                Alive: true,
                Title: recipe.title,
                Text: recipe.text,
            };
        });
    }
    return {
        Space: "docs",
        Documents: result,
    };
}

function fetchInitial(limit: number): DocumentReference[] {
    const result: DocumentReference[] = [];
    for (const r of index.slice(0, limit)) {
        result.push({
            ID: r,
            Updated: recipies[r].date,
        });
    }
    return result;
}

function fetchByTime(startTime: Date, limit: number): DocumentReference[] {
    const result: DocumentReference[] = [];

    const startIndex = index.findIndex((v, i) => {
        return recipies[v].date.getTime() >= startTime.getTime();
    });

    if (startIndex === -1) {
        return result;
    }

    for (let i = startIndex; i < startIndex + limit; i++) {
        if (i >= index.length) {
            break;
        }
        const id = index[i];
        result.push({
            ID: id,
            Updated: recipies[id].date,
        });
    }
    return result;
}

function fetchByReference(afterDocument: string, fromTime: Date, limit: number): DocumentReference[] {
    const startIndex = index.findIndex((v) => {
        return recipies[v].date.getTime() >= fromTime.getTime();
    });

    const subIndex = index.slice(startIndex);
    let docIndex = subIndex.findIndex((v) => v === afterDocument);
    if (docIndex === undefined) {
        return [];
    }
    docIndex++;
    return subIndex.slice(docIndex, docIndex + limit).map((ix): DocumentReference => {
        return {
            ID: ix,
            Updated: recipies[ix].date,
        };
    });
}
