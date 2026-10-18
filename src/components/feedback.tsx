import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { buttonClass, MixedText } from './ui';

// ---------------------------------------------------------------- Toasts

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-rise rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-lg"
          >
            <MixedText>{toast.message}</MixedText>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

// ---------------------------------------------------------------- Confirm dialog

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm>(async () => false);

/** `await confirm({...})` resolves to true if the user confirmed. */
export function useConfirm(): Confirm {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback<Confirm>(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <ConfirmContext value={confirm}>
      {children}
      {request && <ConfirmDialog {...request} onClose={close} />}
    </ConfirmContext>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger,
  onClose,
}: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose(false);
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === ref.current) onClose(false);
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-lg font-semibold">
          <MixedText>{title}</MixedText>
        </h2>
        {message && <div className="mt-2 text-muted">{message}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onClose(false)} className={buttonClass('secondary')}>
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => onClose(true)}
            className={buttonClass(danger ? 'danger-solid' : 'primary')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
