# Aurélien’s workbench

A local, frontend-only portfolio for Aurélien Morel, based on `robot-workbench-scope.md` and his stated return to robotics. Nothing has been published. The three main sections are Publications, Education, and Work. PhD research and robotics publications lead; production AI and startup experience provide supporting context. Contact links are always available below the workbench.

Career facts and dates come from the user-supplied `Aurelien_Morel_Resume.pdf`. Publication summaries and links were checked against the [IEEE RO-MAN 2023 paper record](https://ieeexplore.ieee.org/abstract/document/10309434) and the [ICRA 2022 paper on arXiv](https://arxiv.org/abs/2205.08189). The PhD is explicitly described as research left to co-found Typeless, not a completed degree. Illustrations are abstract diagrams, not experimental results.

## Run

Use Node 22.12+ (or Node 20.19+).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To check the production build:

```sh
npm test
npm run build
npm run preview
```

The lockfile records compatible React 19, React Three Fiber 9, Drei 10, and Three.js versions. Dependencies and fonts are installed locally; the running site does not fetch external assets. The scene is loaded separately from the HTML navigation and content. There is no backend, analytics, form, or external model.

## Make it yours

- `src/content.ts`: identity, return-to-robotics introduction, education, publications, work, email, profile links, and section routes. Dates and contribution wording follow the supplied CV.
- `src/ContentPanel.tsx`: section presentation.
- `src/ProjectIllustration.tsx`: abstract diagrams for the publications.
- `src/scene/config.ts`: object positions, label anchors, arm lengths, joint limits, approach/touch/return poses, and idle poses. Retune poses whenever objects move.
- `src/scene/RobotArm.tsx`: five nested rotational pivots plus gripper motion. `motion.ts` owns the reach, return, and wandering sequence independently of the content panel. The local +Y axis follows each link; `tool-center` marks the gripper endpoint.
- `src/scene/WorkbenchScene.tsx`: procedural desk/objects, fixed orthographic camera, lights, labels, and WebGL failure handling.
- `src/useNavigation.ts`: hash navigation, the idle/reaching/reading state, cancellation, history, and focus restoration.
- `src/styles.css`: palette, typography, responsive layout, and focus styles.

## Behavior and verification

The arrival view gives the workbench the full content width, beneath a compact introduction. After a tap, a drawer opens gently on the right and the scene resizes without remounting. The desktop drawer scrolls independently, with its close control kept in view. Closing restores the wide desk; switching sections keeps the drawer open. On phones, the content expands below the scene. Hidden drawer content is inert, keyboard focus moves to the revealed heading, and system reduced-motion preferences disable the layout transitions.

The papers (Publications), notebook (Education), and prototype (Work) use the same selection function as normal navigation. Clicks update the hash immediately; the arm retracts, approaches, then touches or points. HTML content opens after at most 720 ms without waiting for the animation. A new selection cancels the old timer and starts motion from the current pose. Direct links and browser history reveal content immediately. The previous `#about` and `#projects` links still open Education and Work; `#contact` is now an ordinary page anchor. Closing restores focus; Escape works while reaching and reading.

After each tap, the arm retracts, returns to its default pose, and resumes gentle wandering while the content stays open. The selected notebook stays open, the top publication sheet lifts, or the prototype turns and lights up. A checkmark and ring identify the selected object. Switching sections or closing the panel clears its previous selected appearance.

An occasional idle routine makes a small cube appear, including while a content panel is open. The arm approaches, closes its fingers around it, lifts it, and throws it off the left side of the desk before returning to wandering. “Spawn a cube” starts the same routine on demand; it is disabled while the arm is busy, motion is paused/reduced, or the scene is unavailable. Both triggers choose among four clear spots without repeating the previous one, with pickup poses solved for each position. The first automatic routine starts after 9–14 seconds of active idle time; after either kind of routine, the next waits 18–34 seconds. The cube follows the gripper while held and inherits its release velocity for a short tumbling flight. A navigation click cancels the routine immediately. Hidden/offscreen time does not advance it. `src/scene/cubeRoutine.ts` owns the pickup positions, sequence and cube trajectory.

Reduced motion disables idle motion and navigation delay and applies object selection instantly. The motion toggle does the same. The scene pauses while offscreen or in a hidden tab and uses on-demand rendering when motion is disabled. Pixel ratio is capped; narrow-screen startup reduces shadow resolution. All sections work while the lazy scene loads or if it fails.

63 focused tests cover cancellation, all three direct links and legacy routes, history, Escape/focus restoration, hidden drawer accessibility, stable section switching, reduced motion, scene failure, canvas preservation, pose limits, tool endpoints, return to idle, continued wandering with content open, interrupted gestures, and sampled tool clearance during reaches and returns. The cube tests check all four pickup positions, grasp alignment, release continuity, desk/object clearance, frame-rate independence, random scheduling, manual spawning, duplicate-click protection, panel-open play, and cancellation while waiting, held, or flying. These clearance checks are not a collision solver.

Browser checks cover desktop and 390 px layouts, scene labels and normal navigation, rapid switching, keyboard activation, focus, Escape, reload, Back/Forward, and paused motion. Physical-device frame rate, battery usage, and broad GPU compatibility still need measurement before publication. The 3D chunk is about 251 KB gzip; it is deferred so it does not block the initial HTML interface. Vite reports its normal large-chunk advisory for the Three.js renderer.

## Before publication

1. Review the portfolio adaptation of the CV, particularly employer project descriptions and the listed current role.
2. Add project demos or research footage if desired. Both publications already link to their primary records.
3. Replace abstract illustrations with approved project images if desired.

Notes are intentionally omitted until there is writing to publish. The current page has `noindex` metadata and remains a local prototype. The source CV has not been copied into the publicly served assets. Publishing and a deployment destination are a separate step.

Stack references: [React Three Fiber compatibility](https://r3f.docs.pmnd.rs/getting-started/introduction), [Vite setup](https://vite.dev/guide/).
