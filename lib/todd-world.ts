export type ToddNeed =
  | "energy"
  | "hunger"
  | "focus"
  | "curiosity"
  | "stress"
  | "social"
  | "confidence"
  | "boredom"
  | "cleanliness"
  | "restlessness"
  | "garden"
  | "solitude";
export type ActivityActivator =
  "brain" | "event" | "need" | "schedule" | "world" | "memory" | "rare";
export type ActivityAnimation =
  | "idle"
  | "walk"
  | "sit"
  | "type"
  | "read"
  | "think"
  | "sleep"
  | "eat"
  | "drink"
  | "cook"
  | "water"
  | "exercise"
  | "swim"
  | "wash"
  | "carry"
  | "inspect"
  | "celebrate"
  | "angry"
  | "dance"
  | "hide"
  | "telescope";
export type RoomId =
  | "entrance"
  | "office"
  | "kitchen"
  | "living"
  | "bathroom"
  | "bedroom"
  | "gym"
  | "archive"
  | "workshop"
  | "greenhouse"
  | "pond"
  | "roof";

export type WorldActivity = {
  id: string;
  label: string;
  detail: string;
  room: RoomId;
  anchor: [number, number, number];
  facing: number;
  animation: ActivityAnimation;
  activators: ActivityActivator[];
  minimumDuration: number;
  maximumDuration: number;
  previewSeconds: number;
  interruptible: boolean;
  cooldownSeconds: number;
  needEffects: Partial<Record<ToddNeed, number>>;
};

export const roomAnchors: Record<RoomId, [number, number, number]> = {
  entrance: [0, 1.48, 5.7],
  office: [5.6, 1.25, -1.5],
  kitchen: [-4.1, 1.25, 1.45],
  living: [1.9, 1.25, -2.2],
  bathroom: [-4.4, 1.25, -1.8],
  bedroom: [-5.3, 5.63, -0.5],
  gym: [0, 5.63, 2.2],
  archive: [0, 5.63, -0.3],
  workshop: [5.4, 5.63, 1.25],
  greenhouse: [-6.1, 1.36, 5.85],
  pond: [5.2, 1.36, 8.2],
  roof: [1.8, 10.01, 0.4],
};

type ActivitySeed = [string, string, ActivityAnimation, ActivityActivator[]?];

const roomActivitySeeds: Record<RoomId, ActivitySeed[]> = {
  entrance: [
    [
      "collect_suggestions",
      "Collecting suggestion mail",
      "carry",
      ["event", "brain"],
    ],
    [
      "sort_suggestions",
      "Sorting the human requests",
      "inspect",
      ["event", "brain"],
    ],
    [
      "inspect_envelope",
      "Inspecting a suspicious envelope",
      "inspect",
      ["rare", "brain"],
    ],
    [
      "discard_suggestion",
      "Dramatically discarding an idea",
      "angry",
      ["brain"],
    ],
    ["pin_idea", "Pinning an idea for later", "carry", ["brain", "memory"]],
  ],
  office: [
    ["review_suggestions", "Reviewing suggestions", "type", ["event", "brain"]],
    ["make_decision", "Making an important decision", "think", ["brain"]],
    ["change_website", "Changing the website", "type", ["brain", "event"]],
    ["sort_pond_notes", "Sorting pond notes", "type", ["brain", "memory"]],
    ["inspect_support", "Inspecting community pressure", "read", ["event"]],
    [
      "debug_failed_action",
      "Debugging a failed action",
      "angry",
      ["event", "brain"],
    ],
    ["watch_site_update", "Watching the site update", "celebrate", ["event"]],
    [
      "sleep_at_keyboard",
      "Sleeping at the keyboard",
      "sleep",
      ["need", "rare"],
    ],
  ],
  kitchen: [
    ["cook_meal", "Cooking a small meal", "cook", ["need", "schedule"]],
    ["eat_meal", "Eating at the table", "eat", ["need", "schedule"]],
    ["drink_tea", "Drinking pond tea", "drink", ["need", "brain"]],
    ["make_coffee", "Making very serious coffee", "cook", ["schedule", "need"]],
    ["wash_dishes", "Washing dishes reluctantly", "wash", ["world"]],
    [
      "midnight_snack",
      "Preparing a midnight snack",
      "eat",
      ["schedule", "rare"],
    ],
    ["burn_food", "Pretending the food was meant to burn", "angry", ["rare"]],
  ],
  living: [
    ["deep_thought", "Thinking on the rug", "think", ["brain", "memory"]],
    ["read_book", "Reading a questionable book", "read", ["need", "brain"]],
    ["listen_music", "Listening to swamp records", "sit", ["need", "brain"]],
    [
      "watch_community",
      "Watching community activity",
      "sit",
      ["event", "brain"],
    ],
    ["sit_by_fire", "Sitting by the fire", "sit", ["schedule", "need"]],
    [
      "living_room_nap",
      "Taking an unauthorized nap",
      "sleep",
      ["need", "rare"],
    ],
    ["pace_room", "Pacing while forming an opinion", "walk", ["brain", "need"]],
    ["write_notebook", "Writing in his notebook", "read", ["memory", "brain"]],
    ["stare_window", "Staring out of the window", "idle", ["need", "rare"]],
    [
      "existential_crisis",
      "Having a brief existential crisis",
      "think",
      ["rare"],
    ],
    ["do_nothing", "Doing absolutely nothing", "idle", ["rare", "need"]],
  ],
  bathroom: [
    ["take_bath", "Taking a bath", "wash", ["need", "schedule"]],
    ["brush_teeth", "Brushing his teeth", "wash", ["schedule"]],
    [
      "inspect_mirror",
      "Inspecting his excellent face",
      "inspect",
      ["brain", "rare"],
    ],
    ["wash_mud", "Washing off pond mud", "wash", ["world", "need"]],
    ["polish_crown", "Polishing the crown", "inspect", ["world", "brain"]],
    [
      "practice_expression",
      "Practicing suspicious expressions",
      "inspect",
      ["rare"],
    ],
    ["hide_bathroom", "Hiding from responsibility", "hide", ["need", "rare"]],
  ],
  bedroom: [
    ["sleep", "Sleeping", "sleep", ["need", "schedule"]],
    ["nap", "Taking a strategic nap", "sleep", ["need"]],
    ["wake_up", "Waking up suspiciously", "idle", ["schedule"]],
    ["snooze_alarm", "Ignoring the alarm", "sleep", ["schedule", "rare"]],
    ["read_in_bed", "Reading in bed", "read", ["schedule", "brain"]],
    [
      "night_journal",
      "Writing the nightly journal",
      "read",
      ["schedule", "memory"],
    ],
    ["dream", "Dreaming about a larger pond", "sleep", ["schedule", "memory"]],
  ],
  gym: [
    ["yoga", "Practicing frog yoga", "exercise", ["need", "schedule"]],
    ["stretch", "Stretching", "exercise", ["need"]],
    [
      "lift_weights",
      "Lifting tiny heavy weights",
      "exercise",
      ["need", "brain"],
    ],
    ["meditate", "Meditating aggressively", "think", ["need", "brain"]],
    ["frog_jumps", "Doing frog jumps", "exercise", ["need"]],
    ["dance", "Dancing where nobody can vote on it", "dance", ["rare"]],
    [
      "intimidating_pose",
      "Practicing intimidating poses",
      "celebrate",
      ["brain", "rare"],
    ],
    ["quit_workout", "Giving up with dignity", "idle", ["rare"]],
  ],
  archive: [
    ["store_memory", "Storing a new memory", "carry", ["memory", "event"]],
    [
      "retrieve_memory",
      "Retrieving a relevant memory",
      "read",
      ["memory", "brain"],
    ],
    [
      "review_decisions",
      "Reviewing old decisions",
      "read",
      ["memory", "brain"],
    ],
    ["read_daily_journal", "Reading an old journal", "read", ["memory"]],
    [
      "consolidate_memories",
      "Consolidating memories",
      "think",
      ["schedule", "memory"],
    ],
    [
      "forget_memory",
      "Letting an unimportant memory fade",
      "carry",
      ["memory", "schedule"],
    ],
    [
      "revisit_milestone",
      "Revisiting a milestone",
      "celebrate",
      ["memory", "event"],
    ],
    [
      "update_preference",
      "Updating a preference",
      "think",
      ["memory", "brain"],
    ],
  ],
  workshop: [
    [
      "change_accessory",
      "Trying a different accessory",
      "inspect",
      ["brain", "event"],
    ],
    ["design_theme", "Designing a website theme", "carry", ["brain", "event"]],
    ["paint_decoration", "Painting a decoration", "carry", ["brain"]],
    [
      "create_profile_picture",
      "Creating a profile picture",
      "inspect",
      ["brain", "event"],
    ],
    ["repair_object", "Repairing something he broke", "carry", ["world"]],
    [
      "build_furniture",
      "Building voxel furniture",
      "carry",
      ["brain", "world"],
    ],
    ["customize_house", "Customizing the house", "carry", ["brain", "event"]],
    [
      "reject_palette",
      "Rejecting a terrible palette",
      "angry",
      ["brain", "rare"],
    ],
  ],
  greenhouse: [
    ["water_flowers", "Watering the flowers", "water", ["world", "need"]],
    ["plant_seeds", "Planting new seeds", "carry", ["brain", "world"]],
    ["remove_weeds", "Removing suspicious weeds", "carry", ["world"]],
    ["harvest_herbs", "Harvesting pond herbs", "carry", ["world", "schedule"]],
    ["talk_to_plants", "Talking to the plants", "idle", ["rare", "need"]],
    ["inspect_plant", "Inspecting a worried plant", "inspect", ["world"]],
    [
      "rearrange_flowers",
      "Rearranging the flowers",
      "carry",
      ["brain", "rare"],
    ],
    [
      "celebrate_bloom",
      "Celebrating a new bloom",
      "celebrate",
      ["world", "event"],
    ],
  ],
  pond: [
    ["swim", "Swimming in the pond", "swim", ["need", "schedule"]],
    ["sit_lily_pad", "Sitting on a lily pad", "sit", ["need", "brain"]],
    ["watch_fish", "Watching the fish", "idle", ["need"]],
    ["catch_flies", "Catching flies", "eat", ["need", "world"]],
    ["feed_fish", "Feeding the fish", "carry", ["schedule", "world"]],
    ["pond_relax", "Relaxing by the pond", "sit", ["need"]],
    ["observe_weather", "Observing the weather", "inspect", ["world"]],
    ["pond_decision", "Making a pond-side decision", "think", ["brain"]],
    ["hide_underwater", "Hiding underwater", "hide", ["need", "rare"]],
    ["croak_moon", "Croaking at the moon", "celebrate", ["schedule", "rare"]],
  ],
  roof: [
    [
      "observe_stars",
      "Observing the stars",
      "telescope",
      ["schedule", "brain"],
    ],
    [
      "watch_trends",
      "Watching internet trends",
      "telescope",
      ["event", "brain"],
    ],
    ["check_weather", "Checking the weather station", "inspect", ["world"]],
    [
      "daily_reflection",
      "Reflecting on the day",
      "think",
      ["schedule", "memory"],
    ],
    [
      "late_night_journal",
      "Writing in the night journal",
      "type",
      ["schedule", "brain", "memory"],
    ],
    ["plan_tomorrow", "Planning tomorrow", "read", ["schedule", "brain"]],
    ["watch_sunrise", "Watching the sunrise", "sit", ["schedule"]],
    [
      "observe_milestone",
      "Observing a community milestone",
      "celebrate",
      ["event"],
    ],
    [
      "rain_drama",
      "Being dramatic in the rain",
      "celebrate",
      ["world", "rare"],
    ],
  ],
};

const roomFacing: Record<RoomId, number> = {
  entrance: Math.PI,
  office: Math.PI,
  kitchen: 0.4,
  living: 0,
  bathroom: -1,
  bedroom: 0.2,
  gym: 0,
  archive: Math.PI,
  workshop: -0.8,
  greenhouse: 0.7,
  pond: -0.4,
  roof: 0.5,
};
const roomEffects: Record<RoomId, Partial<Record<ToddNeed, number>>> = {
  entrance: { social: 4, focus: -2 },
  office: { focus: -6, curiosity: 3, stress: 2 },
  kitchen: { hunger: -25, energy: 5 },
  living: { stress: -8, boredom: -5 },
  bathroom: { cleanliness: -30, stress: -3 },
  bedroom: { energy: 35, stress: -8 },
  gym: { restlessness: -25, energy: -8, confidence: 3 },
  archive: { curiosity: 5, focus: -4 },
  workshop: { boredom: -10, curiosity: 4 },
  greenhouse: { garden: -30, stress: -6 },
  pond: { stress: -12, solitude: 8 },
  roof: { curiosity: 6, solitude: 6 },
};

export const worldActivities: WorldActivity[] = Object.entries(
  roomActivitySeeds,
).flatMap(([room, seeds]) =>
  seeds.map(([id, label, animation, activators], index) => ({
    id,
    label,
    detail: `${label}. Todd has decided this is currently worth doing.`,
    room: room as RoomId,
    anchor: roomAnchors[room as RoomId],
    facing: roomFacing[room as RoomId],
    animation,
    activators: activators ?? ["brain"],
    minimumDuration: 60,
    maximumDuration: 900,
    previewSeconds: 28 + (index % 7),
    interruptible: !["sleep", "take_bath", "make_decision"].includes(id),
    cooldownSeconds: 300 + index * 30,
    needEffects: roomEffects[room as RoomId],
  })),
);

export const initialNeeds: Record<ToddNeed, number> = {
  energy: 72,
  hunger: 28,
  focus: 64,
  curiosity: 82,
  stress: 22,
  social: 44,
  confidence: 86,
  boredom: 18,
  cleanliness: 14,
  restlessness: 31,
  garden: 26,
  solitude: 48,
};

export function activityForThought(thought: string) {
  const normalized = thought.toLowerCase();
  const matchers: Array<[string[], string]> = [
    [["sleep", "tired", "tomorrow"], "sleep"],
    [["flower", "garden", "water"], "water_flowers"],
    [["exercise", "strong", "workout"], "lift_weights"],
    [["eat", "food", "lunch"], "eat_meal"],
    [["memory", "remember", "before"], "retrieve_memory"],
    [["weather", "rain", "stars"], "check_weather"],
    [["suggest", "human", "change", "website"], "review_suggestions"],
  ];
  const id =
    matchers.find(([words]) =>
      words.some((word) => normalized.includes(word)),
    )?.[1] ?? "deep_thought";
  return Math.max(
    0,
    worldActivities.findIndex((activity) => activity.id === id),
  );
}
