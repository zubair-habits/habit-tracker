// Confirmation dialogs (docs/modules/module-2.md, decision 9). Uses the one
// <dialog id="ask-dialog"> in index.html. Never window.confirm() or alert().
// Android's back button, or Escape on a laptop, closes it without a choice.

function ask({ title, message, buttons }) {
  const dialog = document.getElementById('ask-dialog');
  document.getElementById('ask-title').textContent = title;
  document.getElementById('ask-message').textContent = message;

  return new Promise((resolve) => {
    // A tap answers straight away. The browser delivers the "close" event only when
    // it next draws the page, which it may delay, so a tap must not wait for it.
    const area = document.getElementById('ask-buttons');
    area.replaceChildren(...buttons.map(({ label, value, className }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', () => {
        dialog.close();
        resolve(value);
      });
      return button;
    }));

    // Closed without a tap (back button, Escape, or a change of view). If a tap
    // already answered, this second resolve does nothing. A late event from an
    // earlier question is ignored while this one is still open.
    const onClose = () => {
      if (dialog.open) return;
      dialog.removeEventListener('close', onClose);
      resolve('');
    };
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}

// Resolves to true or false.
export async function confirmDialog({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false }) {
  const answer = await ask({
    title,
    message,
    buttons: [
      { label: confirmLabel, value: 'yes', className: danger ? 'danger-solid' : 'primary' },
      { label: cancelLabel, value: 'no', className: 'secondary' },
    ],
  });
  return answer === 'yes';
}

// Resolves to 'first', 'second', or null if closed without a choice.
export async function choiceDialog({ title, message, firstLabel, secondLabel }) {
  const answer = await ask({
    title,
    message,
    buttons: [
      { label: firstLabel, value: 'first', className: 'primary' },
      { label: secondLabel, value: 'second', className: 'secondary' },
    ],
  });
  return answer || null;
}

// Closes everything still open, newest first. Used when the view changes, because a
// laptop browser's back button changes the view without closing a dialog.
export function closeAllDialogs() {
  for (const dialog of [...document.querySelectorAll('dialog[open]')].reverse()) dialog.close();
}
