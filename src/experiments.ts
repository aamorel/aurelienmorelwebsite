export type ExperimentId =
  'planning' | 'compliance' | 'averaging' | 'reward' | 'perception' | 'grasps'
export type ExperimentSettings = {
  mode: 'a' | 'b'
  intervention: boolean
  amount: number
  revision: number
  releaseOffset?: number
  wasPushed?: boolean
}
export const INITIAL_EXPERIMENT_SETTINGS: ExperimentSettings = {
  mode: 'a',
  intervention: false,
  amount: 50,
  revision: 0,
}
export type Point2 = [number, number]
export type ExperimentFrame = {
  path: Point2[]
  ghostPaths: Point2[][]
  tip: Point2
  object: Point2
  target: Point2
  obstacle: { x: number; y: number; width: number; height: number } | null
  status: string
  outcome: 'running' | 'success' | 'blocked' | 'uncertain'
  metrics: { label: string; value: string }[]
  force?: Point2
  estimate?: Point2
  uncertainty?: number
  grasps?: { point: Point2; angle: number; valid: boolean; selected: boolean }[]
}
export const EXPERIMENTS: {
  id: ExperimentId
  number: string
  category: string
  title: string
  question: string
  description: string
  modes: [string, string]
  intervention: [string, string]
  amountLabel?: string
  takeaway: string
  detail: string
}[] = [
  {
    id: 'planning',
    number: '02',
    category: 'MOTION PLANNING',
    title: 'Find a way around',
    question: 'Why not go straight there?',
    description:
      'Move a cube to the ring. Put an obstacle in the way, then compare a direct reach with a route that checks for collisions.',
    modes: ['Direct motion', 'Plan a route'],
    intervention: ['Add obstacle', 'Remove obstacle'],
    takeaway: 'A short path is only useful if the robot can actually follow it.',
    detail:
      'The planner searches a tabletop grid with A*, using an inflated obstacle to leave room for the moving cube. This illustrates task-space planning; a real arm must also check its links and joint limits.',
  },
  {
    id: 'compliance',
    number: '03',
    category: 'CONTACT & CONTROL',
    title: 'Give a little',
    question: 'Should a robot be stiff?',
    description:
      'Apply a sideways push to an arm holding its position. Watch its displacement and the spring that pulls it back.',
    modes: ['Soft response', 'Stiff response'],
    intervention: ['Push the arm', 'Release the arm'],
    amountLabel: 'Push strength',
    takeaway: 'Stiffness trades resistance to a push for the ability to yield to contact.',
    detail:
      'A damped spring model responds to an external force. The same force produces a smaller equilibrium displacement with higher stiffness. This is an illustrative endpoint model, not a contact-force or safety simulation.',
  },
  {
    id: 'averaging',
    number: '04',
    category: 'LEARNING FROM DEMONSTRATIONS',
    title: 'Two rights, one wrong',
    question: 'Can averaging good moves make a bad move?',
    description:
      'Two demonstrations take a cube safely around opposite sides of an obstacle. Compare averaging their positions with selecting one complete route.',
    modes: ['Average the moves', 'Choose one route'],
    intervention: ['Hide obstacle', 'Show obstacle'],
    takeaway: 'The average of two successful behaviors can be an unsuccessful behavior.',
    detail:
      'The displayed average is computed point by point from two routes. Selecting a route preserves one coherent behavior. This illustrates multimodal actions; it does not train an imitation-learning policy.',
  },
  {
    id: 'reward',
    number: '05',
    category: 'OBJECTIVES & REWARDS',
    title: 'Mind the score',
    question: 'Did it solve the task—or the score?',
    description:
      'Ask a robot to deliver a cube into a ring. Compare a score that stops rewarding progress near the ring with one that requires the cube to fit inside.',
    modes: ['Close is enough', 'Fully inside'],
    intervention: ['Make the cube bigger', 'Restore cube size'],
    takeaway: 'A scoring rule must distinguish what you want from what merely looks close.',
    detail:
      'A simple search selects the shortest movement that achieves the maximum score. The proximity score saturates before full placement; the containment score accounts for the cube’s size. This illustrates objective specification, not reinforcement-learning training.',
  },
  {
    id: 'perception',
    number: '06',
    category: 'PERCEPTION & UNCERTAINTY',
    title: 'Look before reaching',
    question: 'What if the robot cannot see?',
    description:
      'Hide and move the cube behind a screen. Compare reaching from the last observation with taking another look before acting.',
    modes: ['Act now', 'Look again'],
    intervention: ['Hide & move cube', 'Reveal cube'],
    takeaway: 'Sometimes the most useful next action is to gather information.',
    detail:
      'Occlusion preserves the previous estimate while the actual cube moves. Looking from the side reveals the new position before reaching. The uncertainty region is illustrative, not a calibrated probability distribution.',
  },
  {
    id: 'grasps',
    number: '07',
    category: 'GRASP DIVERSITY',
    title: 'Another way to hold it',
    question: 'Is there only one good grasp?',
    description:
      'Inspect candidate approaches around an object. Block one side and compare keeping a single preferred grasp with choosing from several alternatives.',
    modes: ['One preferred grasp', 'Keep alternatives'],
    intervention: ['Block one side', 'Clear approaches'],
    amountLabel: 'Object elongation',
    takeaway: 'Keeping several valid solutions helps a robot adapt when its options change.',
    detail:
      'Candidates are generated around a rectangular object and checked against a blocked approach region and a simple gripper-width limit. This demonstrates geometric filtering; it does not estimate friction or force closure.',
  },
]
export function experimentById(id: ExperimentId) {
  return EXPERIMENTS.find((experiment) => experiment.id === id)!
}
