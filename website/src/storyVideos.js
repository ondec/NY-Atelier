/**
 * The six portrait (720×1280) house films, shared by Our Story and the Services hero.
 * `focus` is the CSS object-position y for each film on wide screens, which show only a horizontal band of a
 * portrait film: 0% keeps the top of the film, 100% the bottom. Chosen from sampled frames so faces stay in view.
 */
export const STORY_VIDEOS = [
  { src: '/videos/our-story/01.mp4', focus: '18%' }, // fitting a gold agbada: faces about a third down
  { src: '/videos/our-story/02.mp4', focus: '45%' }, // party in orange: faces mid-frame
  { src: '/videos/our-story/03.mp4', focus: '25%' }, // couple on the burgundy stage
  { src: '/videos/our-story/04.mp4', focus: '30%' }, // agbada details, ends on the NY mark
  { src: '/videos/our-story/05.mp4', focus: '38%' }, // garden wedding
  { src: '/videos/our-story/06.mp4', focus: '70%' }, // garden reception: people in the lower half
];
