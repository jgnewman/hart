import hart from "../../src/index"
import * as library from "../../src/index"

import * as constants from "../../src/constants"
import { observable } from "../../src/observables"

window.hart = hart
Object.keys(library).forEach(key => window.hart[key] = library[key])

window.hartConstants = constants
window.hartObservable = observable
