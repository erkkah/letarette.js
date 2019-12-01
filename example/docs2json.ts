import {loadRecipies} from "./recipies";

const recipies = loadRecipies("pg24384.txt");
const index = Object.keys(recipies);

for (const day of index) {
    const date = new Date(day);
    const recipe = recipies[day];
    recipe.date = date;
    console.log(JSON.stringify(recipe));
}
