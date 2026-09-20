import React, { useState } from 'react';
import type { Category } from '../types';
import {
  X,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  Palette
} from 'lucide-react';
import { db } from '../db/db';
import { triggerHaptic } from '../utils/imageUtils';

interface CategoryManagementModalProps {
  categories: Category[];
  onClose: () => void;
  onRefresh: () => void;
}

const colorPresets = [
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ef4444', // red
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f97316', // orange
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  categories,
  onClose,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setColor('#f59e0b');
    setDescription('');
    setEditingId(null);
    setIsEditing(false);
  };

  const handleStartEdit = (cat: Category) => {
    triggerHaptic('light');
    setName(cat.name);
    setColor(cat.color || '#f59e0b');
    setDescription(cat.description || '');
    setEditingId(cat.id);
    setIsEditing(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      setIsSaving(true);
      if (editingId) {
        await db.categories.update(editingId, {
          name: name.trim(),
          color,
          description: description.trim() || undefined,
        });
      } else {
        const newId = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await db.categories.add({
          id: newId,
          name: name.trim(),
          color,
          description: description.trim() || undefined,
        });
      }

      triggerHaptic('success');
      resetForm();
      onRefresh();
    } catch (err) {
      console.error('Failed to save category:', err);
      alert('Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (categories.length <= 1) {
      alert('You must keep at least one category.');
      return;
    }

    triggerHaptic('warning');
    if (
      window.confirm(
        `Delete category "${cat.name}"? Existing products in this category will keep their records.`
      )
    ) {
      await db.categories.delete(cat.id);
      triggerHaptic('light');
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 flex-shrink-0" />

        {/* Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Manage Categories</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Create or Edit Form */}
          <form
            onSubmit={handleSaveCategory}
            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {isEditing ? <Edit2 className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isEditing ? 'Edit Category' : 'Add New Category'}</span>
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Category Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Fast Moving Items"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Color Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-slate-400" />
                <span>Badge Color</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {colorPresets.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setColor(c);
                    }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Boxes, tapes, and packing wraps"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isEditing ? 'Update Category' : 'Create Category'}</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Existing Categories ({categories.length})
            </h3>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{cat.name}</h4>
                      {cat.description && (
                        <p className="text-[11px] text-slate-400 truncate">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end safe-bottom">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
