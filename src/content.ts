// Career facts: user-supplied Aurelien_Morel_Resume.pdf and subsequent clarifications.
// Typeless sale to Doctolib for an undisclosed amount: confirmed by Aurélien.
// Return-to-robotics positioning: Aurélien's stated direction.
// Publication summaries and links: the IEEE/arXiv records linked below.
export const profile = {
  name: 'Aurélien Morel',
  role: 'Robotics & applied AI',
  location: 'Paris',
  headline: ['Back to robotics.', 'With more to build.'],
  introduction:
    'I’m returning to robotics, bringing together research in modular robots and grasping with experience taking AI systems from prototype to production.',
  focus: ['Robot manipulation', 'Planning & control', 'Learning through exploration'],
  tools: ['Python', 'PyTorch', 'Docker', 'Kubernetes', 'AWS', 'GCP'],
  email: 'aurelien.morel.arthur@gmail.com',
  links: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/aurelien-morel-france/' },
    { label: 'GitHub', url: 'https://github.com/aamorel/' },
  ],
}

export const education = [
  {
    degree: 'PhD research · Modular robotics',
    school: 'EPFL · BioRob',
    dates: '2022 – 2023',
    detail:
      'Research on self-reconfigurable modular robots, with a focus on collaborative object manipulation, transport, and handover to people. First-author publication at IEEE RO-MAN 2023.',
    note: 'Left the PhD to co-found Typeless in 2023.',
    featured: true,
  },
  {
    degree: 'MSc Robotics',
    school: 'EPFL',
    dates: '2018 – 2021',
    detail:
      'A six-month research project at ISIR, Sorbonne Université, explored diverse grasping trajectories through behavior shaping and novelty search. First-author publication at IEEE ICRA 2022.',
    note: '',
    featured: false,
  },
  {
    degree: 'BSc Mechanical Engineering',
    school: 'EPFL',
    dates: '2015 – 2018',
    detail:
      'Mechanical engineering foundations, including an exchange year at Nanyang Technological University in Singapore, 2017–2018.',
    note: '',
    featured: false,
  },
]

export const publications = [
  {
    title:
      'End-to-End Planner for Self-Reconfigurable Modular Robots: Collaborative Objects Manipulation, Transport and Handover to Human Application',
    venue: 'IEEE RO-MAN',
    year: '2023',
    authorship: 'First author',
    context: 'PhD research · EPFL BioRob',
    summary:
      'Planning how modular robots work together to move objects and hand them to a person. The planner combines search with a constrained controller to coordinate manipulation and transport.',
    tags: ['Modular robotics', 'Planning', 'Human–robot interaction'],
    illustration: 'mechanism' as const,
    url: 'https://ieeexplore.ieee.org/abstract/document/10309434',
    linkLabel: 'Paper on IEEE Xplore',
  },
  {
    title:
      'Automatic Acquisition of a Repertoire of Diverse Grasping Trajectories through Behavior Shaping and Novelty Search',
    venue: 'IEEE ICRA',
    year: '2022',
    authorship: 'First author',
    context: 'Research project · ISIR, Sorbonne Université',
    summary:
      'Generating varied grasping movements through exploration in simulation, helping address the scarcity of successful grasps for learning. Evaluated on simulated robot platforms and demonstrated on a real Baxter robot.',
    tags: ['Grasping', 'Novelty search', 'Robot learning'],
    illustration: 'grasping' as const,
    url: 'https://arxiv.org/abs/2205.08189',
    linkLabel: 'Open paper on arXiv',
  },
]

export const work = [
  {
    organization: 'Typeless',
    role: 'Co-founder & CTO',
    dates: '2023 – May 2024',
    description:
      'Co-founded a four-person startup and built the initial product end to end, from models and APIs to frontend prototypes. Led product development and customer pilots, raised pre-seed funding, and secured paid pilots.',
    context: 'Acquired by Doctolib in May 2024 for an undisclosed amount.',
    tags: ['Prototyping', 'Product engineering', 'Startup building'],
  },
  {
    organization: 'Doctolib',
    role: 'Senior ML Engineer',
    dates: 'May 2024 – present',
    description:
      'Building and deploying AI systems in production: real-time inference, LLM agents, orchestration, and evaluation. Led the AI side of a reasoning-system redesign and worked on GPU optimization and autoscaling.',
    context: 'Joined Doctolib following its acquisition of Typeless.',
    tags: ['Real-time systems', 'Agents & evaluation', 'Production ML'],
  },
]

export type Section = 'publications' | 'education' | 'work'
export const sections: {
  id: Section
  label: string
  number: string
  object: string
  description: string
}[] = [
  {
    id: 'publications',
    label: 'Publications',
    number: '01',
    object: 'The papers',
    description: 'Modular robots, grasping, and exploration.',
  },
  {
    id: 'education',
    label: 'Education',
    number: '02',
    object: 'The notebook',
    description: 'PhD research and engineering at EPFL.',
  },
  {
    id: 'work',
    label: 'Work',
    number: '03',
    object: 'The prototype',
    description: 'From early ideas to working AI systems.',
  },
]

export function parseSection(hash: string): Section | null {
  const value = hash.replace(/^#/, '')
  // Preserve the previous local prototype's links after reorganizing the site.
  if (value === 'about') return 'education'
  if (value === 'projects') return 'work'
  return sections.some((section) => section.id === value) ? (value as Section) : null
}
