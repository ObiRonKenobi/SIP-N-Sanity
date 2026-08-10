/**
 * Sprite path helpers. Drop Gemini PNGs into public/sprites/ matching these keys.
 * Components use SpriteImg which falls back when a file is missing.
 */

export const SPRITES = {
  officeIso: "/sprites/maps/office-iso.png",
  deskIso: "/sprites/furniture/desk-iso.png",
  deskIsoAlt: "/sprites/furniture/desk-iso-alt.png",
  deskRegular: "/sprites/furniture/desk-regular.png",
  deskHero: "/sprites/furniture/desk-hero.png",
  deskSanta: "/sprites/furniture/desk-santa.png",
  deskManager: "/sprites/furniture/desk-manager.png",
  chairIso: "/sprites/furniture/chair-iso.png",
  livetelLogo: "/sprites/ui/livetel-logo.png",
  livetelLogoSm: "/sprites/ui/livetel-logo-sm.png",
  walk: (id: string, facing: string, frame: string) =>
    `/sprites/characters/walk/${id}-${facing}-${frame}.png`,
  outdoorPark: "/sprites/smoke/outdoor-park.png",
  witchStand: "/sprites/characters/boss/witch-stand.png",
  witchOutdoor: "/sprites/characters/boss/witch-outdoor.png",
  ogreStall: "/sprites/characters/boss/ogre-stall.png",
  toiletClean: "/sprites/bathroom/toilet-clean.png",
  stallEmpty: "/sprites/bathroom/stall-empty.png",
  stallDoor: (i: number) =>
    `/sprites/bathroom/stall-door-${["blue", "green", "brown"][i] ?? "blue"}.png`,
  restroomBg: "/sprites/bathroom/restroom-bg.png",
  ticketRed: "/sprites/ui/ticket-red.png",
  bubbleLeft: "/sprites/ui/bubble-tail-left.png",
  bubbleRight: "/sprites/ui/bubble-tail-right.png",
  bubbleDown: "/sprites/ui/bubble-tail-down.png",
  bubbleShout: "/sprites/ui/bubble-shout.png",
  iconSanity: "/sprites/ui/icon-sanity.png",
  iconCsat: "/sprites/ui/icon-csat.png",
  iconQueue: "/sprites/ui/icon-queue.png",
  iconSmoke: "/sprites/ui/icon-smoke.png",
  iconCoffee: "/sprites/ui/icon-coffee.png",
  playerDesk: (
    pose: "idle" | "type" | "glance-left" | "glance-right" | "phone",
  ) => `/sprites/characters/player/player-desk-${pose}.png`,
  playerCoffeeBreak: "/sprites/characters/player/player-coffee-break.png",
  playerStand: (facing: string, frame: string) =>
    `/sprites/characters/player/player-${facing}-${frame}.png`,
  desk: (id: string, pose: string) =>
    `/sprites/characters/desk/${id}-${pose}.png`,
  stealth: (id: string, dir: string) =>
    `/sprites/characters/walk/${id}-${dir}-idle.png`,
  butterfly: (frame: 1 | 2) => `/sprites/smoke/butterfly-${frame}.png`,
  squirrel: (frame: 1 | 2) => `/sprites/smoke/squirrel-${frame}.png`,
  puff: (frame: 1 | 2 | 3) => `/sprites/smoke/puff-${frame}.png`,
} as const;
