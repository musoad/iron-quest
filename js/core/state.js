// js/core/state.js

import { getAllData } from "../systems/db.js"

export async function createState() {
  const dbData = await getAllData()

  return {
    ...dbData,
    currentRoute: "dashboard"
  }
}
