import { startCountdown } from './countdown';

export function createLaunch(onLaunch: () => void) {
  const dialog = document.querySelector<HTMLDialogElement>('#launch-menu')!;
  const briefing = document.querySelector<HTMLElement>('#launch-briefing')!;
  const countdown = document.querySelector<HTMLElement>('#launch-countdown')!;
  const count = document.querySelector<HTMLElement>('#launch-count')!;
  const launch = document.querySelector<HTMLButtonElement>('#launch-game')!;
  const cancel = document.querySelector<HTMLButtonElement>('#cancel-launch')!;
  let stopCountdown: (() => void) | undefined;

  function cancelLaunch(): void {
    stopCountdown?.();
    stopCountdown = undefined;
    dialog.close();
    document.querySelector<HTMLButtonElement>('#deploy')!.focus();
  }
  launch.addEventListener('click', () => {
    if (stopCountdown) return;
    briefing.hidden = true;
    countdown.hidden = false;
    cancel.focus();
    stopCountdown = startCountdown(
      (remaining) => {
        count.textContent = remaining === 0 ? 'GO' : String(remaining);
      },
      () => {
        stopCountdown = undefined;
        dialog.close();
        onLaunch();
      },
    );
  });
  cancel.addEventListener('click', cancelLaunch);
  wireLaunchCancellation(dialog, cancelLaunch, () => {
    if (stopCountdown) cancelLaunch();
  });

  return {
    open(): void {
      if (dialog.open) return;
      briefing.hidden = false;
      countdown.hidden = true;
      count.textContent = '';
      dialog.showModal();
      launch.focus();
    },
  };
}

function wireLaunchCancellation(
  dialog: HTMLDialogElement,
  cancel: () => void,
  interrupt: () => void,
): void {
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancel();
  });
  addEventListener('blur', interrupt);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) interrupt();
  });
}
