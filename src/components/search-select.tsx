"use client";

import { useMemo, useState } from "react";

export function SearchSelect({
  label,
  value,
  options,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = (query || value).toLowerCase();
    return options.filter((item) => item.toLowerCase().includes(q)).slice(0, 12);
  }, [options, query, value]);

  return (
    <label className="relative block space-y-1">
      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{label}</span>
      <div className="flex gap-1">
        <input
          value={open ? query : value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            onChange(event.target.value);
          }}
          className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 text-base disabled:opacity-50"
        />
        {value ? (
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-400"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
          >
            ✕
          </button>
        ) : null}
      </div>
      {open && !disabled ? (
        <>
          <button type="button" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} aria-label="Close list" />
          <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-md">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
            ) : (
              filtered.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="min-h-11 w-full px-3 py-2 text-left text-base hover:bg-blue-50"
                    onClick={() => {
                      onChange(item);
                      setQuery(item);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      ) : null}
    </label>
  );
}
