import { readFileSync } from "fs";

import {
    DocumentManager,
    DocumentRequest,
    DocumentUpdate,
    IndexUpdate,
    IndexUpdateRequest,
} from "letarette";

interface Recipe {
    title: string;
    text: string;
}

interface RecipeMap {
    [day: string]: Recipe;
}

const recipies = loadRecipies("pg24384.txt");
const recipiesByTimestamp: {[key: number]: string} = {};

for (const day of Object.keys(recipies)) {
    const date = new Date(day);
    recipiesByTimestamp[date.getTime()] = day;
}

const mgr = new DocumentManager("nats://localhost:4222");
mgr.connect().then(() => {
    mgr.startIndexRequestHandler(handleIndexRequest);
    mgr.startDocumentRequestHandler(handleDocumentRequest);
});

function handleIndexRequest(req: IndexUpdateRequest): IndexUpdate {
    return {
        Space: "docs",
        Updates: [],
    };
}

function handleDocumentRequest(req: DocumentRequest): DocumentUpdate {
    return {
        Space: "docs",
        Documents: [],
    };
}

function loadRecipies(path: string): RecipeMap {
    const bookFile = readFileSync(path);
    const lines = bookFile.toString().split(/[\n\r]+/);

    const result: RecipeMap = {};
    let currentID = "";
    const currentRecipe: Recipe = {
        title: "",
        text: "",
    };

    let month = "";
    let parsingRecipe = false;

    for (const line of lines) {
        const atEnd =  line.startsWith("*** END OF THIS PROJECT");

        const monthMatch = line.match(/^([A-Z]{3,})\.$/);
        if (monthMatch) {
            month = monthMatch[1];
        }

        if (month === "") {
            continue;
        }

        const titleMatch = line.match(/^(\d{1,2})\.?--(.*)/);

        if (parsingRecipe) {
            if (titleMatch || atEnd) {
                result[currentID] = {
                    ...currentRecipe,
                };
                currentRecipe.text = "";
                parsingRecipe = false;
            } else {
                currentRecipe.text += line;
            }
        }

        if (atEnd) {
            break;
        }

        if (titleMatch) {
            const day = titleMatch[1];
            currentID = `${month}-${day}`;
            currentRecipe.title = titleMatch[2];
            parsingRecipe = true;
        }
    }

    return result;
}
