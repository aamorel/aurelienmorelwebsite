# Personal website — a tiny robot workbench

A quick starting point for implementation. These are proposed defaults, not a rigid spec.

## The idea

A warm miniature workbench inhabited by a small robotic arm. Visitors click objects on the desk to explore my work and background. The arm reaches toward the selected object, makes a small deliberate gesture, and the corresponding content opens.

When nobody interacts, the arm slowly moves between a few resting and inspecting poses. It should feel quietly curious: a little engineering companion with personality conveyed through movement.

The website should still make it immediately clear whose site this is and what I do. The scene gives it character; the writing and projects give it substance.

## What it looks like

- A small wooden desk or platform, viewed from above at a three-quarter angle.
- A compact arm with rounded links, a simple two-finger gripper, and visible joints. Start with roughly five rotational joints plus the gripper; exact industrial fidelity is optional.
- Cream or muted sage paint, charcoal joints, warm wood, and one restrained accent color.
- Soft lighting and grounding shadows. A warm background that blends with the surrounding page.
- Three or four objects arranged in a reachable arc around the arm. Plenty of space between them.
- An orthographic camera as the first experiment: it can give the scene a miniature illustration feel. Try a narrow perspective camera if it feels too flat.
- Fixed composition initially. Camera rotation can be a development tool rather than a visitor requirement.

Avoid clutter and extensive surface detail at first. Lighting, proportions, and motion should do most of the work. Keep text crisp; skip depth-of-field blur initially.

## A first menu

| Object | Section | Arm gesture |
| --- | --- | --- |
| Notebook | About | Gently touches the cover |
| Small prototype on a stand | Projects | Reaches toward or points at the prototype |
| Stack of note cards | Notes | Hovers above the top card |
| Envelope | Contact | Taps the envelope |

These are placeholders. If there is no writing to publish, leave Notes out. Three good destinations are enough. Start with touches and pointing; picking objects up adds attachment, orientation, and placement work.

Show readable labels beside the objects from the start. Don't make visitors decode the objects. Put my name and a short introduction in ordinary HTML outside the canvas. Draft content should be visibly marked as placeholder until supplied or verified.

## How it behaves

**Arrival:** the introduction and normal navigation are available immediately. The scene loads independently, with a quiet loading placeholder. The arm is already in a welcoming pose; no compulsory intro animation.

**Idle:** blend slowly between a small collection of safe poses, with pauses. Occasional wrist or gripper movement gives the impression of inspecting something. Avoid continuous oscillation of every joint. Stop idle behavior while someone reads an open section.

**Hover or keyboard focus:** highlight the object and its label. Optionally turn the wrist slightly toward it. Don't make the whole arm chase the pointer in v1.

**Selection:** acknowledge the click immediately. Move toward the object's approach pose, then its touch pose. Aim for roughly 600–900 ms in total as a starting design value, adjusted by feel. Reveal the content near the final gesture, with a maximum delay so navigation never depends on an animation completing successfully.

**Reading:** on desktop, open an HTML panel beside the scene. Use a stable layout with room already reserved for content, so opening the panel doesn't move the target away halfway through the reach. On mobile, put the content below the scene. Long content scrolls normally.

**Closing or switching:** return to a calm pose or reach toward the next object. A new selection supersedes the previous animation; don't queue clicks. Cancel stale completion callbacks so they cannot open the wrong section.

Use a small state model: idle, reaching, reading. Track hovered object separately. Both ordinary navigation and scene objects call the same selection function.

## The smallest version worth building

One desktop scene, one articulated arm, three labeled objects, a convincing idle loop, and one click-to-reach-to-content interaction. Then reuse that interaction for the remaining sections.

Use hash destinations such as `#about` and `#projects` initially. Direct links, reload, and browser back/forward should work; opening a direct link should show its content immediately. Keep the canvas mounted when changing sections. A later production version can use full routes if needed.

Keep the first build frontend-only: content in local data or React components, Contact as ordinary links. No backend, CMS, physics engine, contact form, sound, or full robotics simulator needed.

## Tech direction

Recommendation: **React + TypeScript + Vite + Three.js through React Three Fiber, with Drei helpers.** This is an engineering choice for a quick interactive prototype, rather than a requirement.

| Piece | Proposed choice | Why / tradeoff |
| --- | --- | --- |
| App and dev setup | React, TypeScript, Vite | Small starting point; static build; easy iteration |
| 3D scene | Three.js + React Three Fiber | Scene expressed as React components, alongside the rest of the site |
| Scene helpers | Drei | `Html` for anchored labels; `useGLTF` if models are introduced; shadow helpers as needed |
| UI and content | Ordinary HTML + CSS | Readable text, selectable content, keyboard navigation, responsive layout |
| Motion | One `useFrame` controller with time-based interpolation | Enough for pose transitions and idle motion; no extra animation library initially |
| State | React state for selection and mode; refs for frame-level motion | Keep application state separate from continuous joint updates |
| Assets | Procedural geometry first; GLB later | Start without an external model or a Blender dependency |

React Three Fiber is a React renderer for Three.js. Its docs currently pair Fiber 9 with React 19 and identify Fiber 10 as alpha. Use compatible stable releases, check peer dependencies during setup, and commit the lockfile. Use the standard WebGL path initially; this scene doesn't need an experimental rendering stack.

Drei's `Html` anchors DOM content to a scene position. Use this for screen-facing labels, with real links or buttons and clear focus styles. Keep the main content panel in the normal DOM outside the canvas. Ensure label clicks and mesh clicks do not fire duplicate selections.

Plain Three.js is also viable, especially if avoiding React. A visual scene editor is another route if art iteration becomes the main activity. For this first version, the React approach keeps motion logic, scene layout, and UI close together.

Vite is the prototype default. Reconsider prerendering/static generation before publishing if search visibility and a larger writing section become important; the scene can remain a client-side component within another framework.

## How to make the arm move

There are three useful levels:

| Approach | What it gives us | Limitation |
| --- | --- | --- |
| Authored joint poses | Fast, controllable movements toward fixed objects | Poses need retuning if objects move; joint interpolation doesn't guarantee a straight or collision-free tool path |
| Analytic IK for a simple arm | Position the gripper from a target point using base yaw and a two-link shoulder/elbow solution | Requires a matching arm geometry; reach limits and elbow branch continuity need handling |
| Numerical IK | More flexible chains and targets | More solver tuning, constraints, and singularity handling; position and orientation are separate concerns |

**Start with authored poses.** The objects have fixed locations, so real-time IK is optional. Build nested pivot groups, with each child link attached to its parent joint. Define rotation axes, link lengths, angle limits, and a tool-center marker explicitly.

For each object, store an approach pose, a touch pose, and a safe return pose. Interpolate joint angles with a smooth start/stop easing curve. Keep motion within limits and manually inspect the swept path, including transitions interrupted halfway through. Where necessary, retract through a safe waypoint before reaching elsewhere. Keep the chosen joint-angle representation continuous to avoid unintended full rotations.

Use elapsed time or frame delta, rather than a fixed increment per rendered frame. Apply motion through refs in `useFrame`; don't set React state every frame. One controller owns each joint's transform so hover, idle, and reach animations don't fight.

If later adding IK, start with a deliberately simple yaw + shoulder + elbow chain and a wrist orientation chosen for each object. Clamp unreachable targets, retain the previous solution branch, and keep motion limits. Do not assume a generic IK solver also handles collision avoidance or trajectory planning.

Three.js includes `CCDIKSolver`, but it is designed for `SkinnedMesh` skeletons. It isn't a direct fit for the initial nested rigid-group arm; use it only if the asset structure supports that choice.

## Assets and polish

Build the first desk, links, joints, notebook, and envelope from simple meshes. This avoids getting blocked by asset sourcing and makes pivots easy to control.

If replacing them with a Blender export, use GLB and preserve separate rigid links with named joint pivots. Confirm axes, scale, hierarchy, and rest transforms before replacing the procedural arm. A visually attractive single merged robot mesh won't necessarily be animatable. Check attribution and reuse rights for any third-party assets.

Start with basic lighting and a modest shadow map. Drei's contact-shadow helper is an option to evaluate, not a requirement: a moving arm requires updated shadows, which can add cost. Keep materials simple and reuse them.

## Make it pleasant to use

- Normal HTML navigation remains available while 3D loads or if it fails. All sections remain accessible without interacting with the arm.
- Reduced-motion preference: disable idle movement and show content immediately on selection, using a static pose or minimal transition.
- Keyboard focus gets the same highlight as hover. Move focus appropriately into opened content and restore it on close; Escape can close the panel.
- On small screens, use a simpler composition and generous tap targets. Hover is optional enhancement only.
- Pause animation when the tab is hidden or the scene is offscreen. Limit pixel ratio and reduce shadows on slower devices.
- Aim for fluid motion on a typical laptop and usable behavior on a phone. Measure on actual devices before adding effects. Download-size and frame-rate budgets should be set after the first scene exists.

## Build order

1. Get the camera, desk, palette, and HTML introduction looking good with a static primitive arm.
2. Make one labeled notebook interactive. Implement the full selection, reach, content, and close loop.
3. Add remaining destinations, interruption handling, and the idle behavior.
4. Make direct links, keyboard use, reduced motion, mobile layout, and loading failure work.
5. Polish the geometry and motion. Only then decide whether Blender assets or IK improve the result enough to add them.

First milestone: a visitor can identify me, click Projects, watch a satisfying brief reach, and read a project without fighting the interface. Check rapid clicks, resizing during a reach, direct links, browser history, and a failed canvas load manually. Add focused automated coverage for navigation/cancellation if that logic becomes complex.

## Nice ideas for later

- The arm quietly sorts two or three small pieces when idle.
- A joint/frame overlay for visitors who want to inspect the robotics.
- A tiny teach mode where someone can position a target within the workspace.
- Project-specific objects replacing generic menu props.
- An occasional small acknowledgment when someone returns to the homepage.

## Still open — can decide while building

- Three sections or four? Start with About, Projects, Contact.
- How expressive should the arm be? Start subtly curious, with no face.
- How handmade versus industrial should it look? Start with rounded, painted links and exposed dark joints.
- Which real projects and personal details belong on the desk? Use placeholders until selected.

## Official references

Technical references checked on 2026-10-15; the architecture and design decisions above are recommendations.

- [Vite setup and React TypeScript templates](https://vite.dev/guide/)
- [React Three Fiber introduction and version compatibility](https://r3f.docs.pmnd.rs/)
- [Drei introduction](https://drei.docs.pmnd.rs/getting-started/introduction)
- [Drei Html: DOM labels anchored to 3D objects](https://drei.docs.pmnd.rs/misc/html)
- [Drei useGLTF: loading GLB/glTF assets](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf)
- [Drei ContactShadows](https://drei.docs.pmnd.rs/staging/contact-shadows)
- [Fiber performance pitfalls and frame updates](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [Fiber scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Three.js CCDIKSolver and skeleton requirements](https://threejs.org/docs/pages/CCDIKSolver.html)

## Handoff to the implementation agent

Build the smallest version above. Use the proposed stack unless the existing repository has a good reason to keep its own framework. Start with procedural assets and authored joint poses. Prioritize the warm miniature composition and the complete one-object interaction before adding objects or visual effects. Keep targets and poses in one configuration, keep content separate from scene code, and make navigation work independently of animation. This document authorizes a local prototype; publishing is a separate step.
