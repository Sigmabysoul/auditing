import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { triggerHaptic } from '../utils/imageUtils';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType?: string;
  onConfirm: () => void;
  onClose: () => void;
  isDangerous?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title,
  itemName,
  itemType = 'item',
  onConfirm,
  onClose,
  isDangerous = false,
}) => {
  const [typedVerification, setTypedVerification] = useState('');
  const expectedText = itemName.trim().toLowerCase();
  const isMatch = typedVerification.trim().toLowerCase() === expectedText;

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isMatch && isDangerous) return;
    triggerHaptic('warning');
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-slate-900 dark:bg-slate-900 light:bg-white border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white light:text-slate-900">{title}</h3>
              <p className="text-xs text-slate-400 light:text-slate-500">Accidental Deletion Protection</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="bg-rose-950/30 light:bg-rose-50 border border-rose-500/30 rounded-2xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 light:text-rose-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Permanent Action Warning</span>
          </div>
          <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
            Are you sure you want to delete <strong className="text-white light:text-slate-900 underline font-mono">{itemName}</strong>?
            All associated warehouse stock records will be removed.
          </p>
        </div>

        {/* Typed verification input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 light:text-slate-700">
            To confirm, type <span className="font-mono text-rose-400 light:text-rose-600 font-bold select-all">&quot;{itemName}&quot;</span> below:
          </label>
          <input
            type="text"
            value={typedVerification}
            onChange={(e) => setTypedVerification(e.target.value)}
            placeholder={`Type ${itemName} to confirm`}
            className="w-full bg-slate-950 light:bg-slate-100 border border-slate-700 light:border-slate-300 rounded-xl px-3.5 py-2 text-xs text-white light:text-slate-900 focus:outline-none focus:border-rose-500 font-mono"
            autoFocus
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 text-slate-300 light:text-slate-800 font-semibold text-xs transition active:scale-95"
          >
            Cancel (Keep Safe)
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatch}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete {itemType}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

