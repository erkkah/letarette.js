import { readFileSync } from "fs";

export interface Recipe {
    title: string;
    text: string;
    date: Date;
}

export interface RecipeMap {
    [day: string]: Recipe;
}

export function loadRecipies(path: string): RecipeMap {
    const bookFile = readFileSync(path);
    const lines = bookFile.toString().split(/[\n\r]+/);

    const result: RecipeMap = {};
    let currentID = "";
    const currentRecipe: Recipe = {
        title: "",
        text: "",
        date: new Date(),
    };

    let month = "";
    let parsingRecipe = false;
    let recipeLines: string[] = [];

    for (const line of lines) {
        const atEnd =  line.startsWith("INDEX.");

        if (!atEnd) {
            const monthMatch = line.match(/^([A-Z]{3,})\.$/);
            if (monthMatch) {
                month = monthMatch[1];
                continue;
            }
        }

        if (month === "") {
            continue;
        }

        const titleMatch = line.match(/^(\d{1,2})\.{0,1}--(.*)/);

        if (parsingRecipe) {
            if (titleMatch || atEnd) {
                currentRecipe.text = recipeLines.join(" ");
                result[currentID] = {
                    ...currentRecipe,
                };
                recipeLines = [];
                parsingRecipe = false;
            } else {
                recipeLines.push(line);
            }
        }

        if (atEnd) {
            break;
        }

        if (titleMatch) {
            const day = titleMatch[1];
            currentID = `${month}-${day} 2001 UTC`;
            currentRecipe.title = titleMatch[2];
            parsingRecipe = true;
        }
    }

    return result;
}
