// js/core/appCore.js

import { initDB } from "../systems/db.js"
import { createRouter } from "./router.js"
import { createState } from "./state.js"
import { render } from "./renderEngine.js"

import * as dashboard from "../modules/dashboard.js"
import * as log from "../modules/log.js"
import * as joggen from "../modules/joggen.js"
import * as skilltree from "../modules/skilltree.js"
import * as analytics from "../modules/analytics.js"
import * as health from "../modules/health.js"
import * as boss from "../modules/boss.js"
import * as challenges from "../modules/challenges.js"
import * as backup from "../modules/backup.js"

const modules = {
  dashboard,
  log,
  joggen,
  skilltree,
  analytics,
  health,
  boss,
  challenges,
  backup
}

export async function startApp() {
  await initDB()

  const state = await createState()

  const router = createRouter(Object.keys(modules), (route) => {
    render(route, modules[route], state)
  })

  router.init()
}
