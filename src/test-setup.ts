/*
  Global test setup, loaded by vitest before every file.

  Testing Library waits one second by default for `waitFor`/`findBy*`. That is
  plenty for a component, but this suite runs forty files in parallel and the
  widest of them render a page with three queries in flight, so a machine under
  load can miss a one-second deadline while the first rows are still painting.
  What surfaced was a flake that moved between tests — always "expected 1 to be
  5" against a table still on its loading row, never a real regression.

  Five seconds is long enough to absorb that and still short enough that a genuine
  hang fails the run rather than sitting there.
*/

import { configure } from '@testing-library/react'

configure({ asyncUtilTimeout: 5000 })
