import { enableKeyboard } from '../input/keyboard';
import { createLaunch } from './launch';

export function createScreens(actions: { deploy(): void; quit(): void }) {
  const dashboard = document.querySelector<HTMLElement>('#dashboard')!;
  const hud = document.querySelector<HTMLElement>('#hud')!;
  const menu = document.querySelector<HTMLDialogElement>('#start-menu')!;
  const deploy = document.querySelector<HTMLButtonElement>('#deploy')!;
  const start = document.querySelector<HTMLButtonElement>('#start-button')!;
  const resume = document.querySelector<HTMLButtonElement>('#resume')!;
  let playing = false;

  function pause(): void {
    if (!playing || menu.open) return;
    enableKeyboard(false);
    menu.showModal();
    resume.focus();
  }
  function resumeGame(): void {
    menu.close();
    enableKeyboard(true);
    start.focus();
  }
  const launch = createLaunch(() => {
    playing = true;
    dashboard.hidden = true;
    hud.hidden = false;
    actions.deploy();
    enableKeyboard(true);
    start.focus();
  });
  deploy.addEventListener('click', launch.open);
  start.addEventListener('click', pause);
  resume.addEventListener('click', resumeGame);
  document.querySelector('#quit')!.addEventListener('click', () => {
    playing = false;
    enableKeyboard(false);
    menu.close();
    actions.quit();
    hud.hidden = true;
    dashboard.hidden = false;
    deploy.focus();
  });
  wirePauseEvents(menu, { pause, resume: resumeGame });
  deploy.focus();
  return { isRunning: () => playing && !menu.open };
}

function wirePauseEvents(
  menu: HTMLDialogElement,
  actions: { pause(): void; resume(): void },
): void {
  menu.addEventListener('cancel', (event) => {
    event.preventDefault();
    actions.resume();
  });
  addEventListener('keydown', (event) => {
    if (event.code !== 'Escape' || event.repeat || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    actions.pause();
  });
  addEventListener('blur', actions.pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) actions.pause();
  });
}
