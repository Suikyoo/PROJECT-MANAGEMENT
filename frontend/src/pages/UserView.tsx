// ~/src/pages/UserView.tsx
import { For, createSignal, createResource, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { session } from '../lib/store';
import { getInsiderUserById } from '../lib/fetch';
import { CheckCheck } from 'lucide-solid';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const ALL_ROLES: { value: string; label: string; bg: string; text: string }[] = [
  { value: 'Supervisor', label: 'Supervisor', bg: 'bg-violet-500/15', text: 'text-violet-400' },
  { value: 'QA', label: 'QA', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  { value: 'Developer', label: 'Developer', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { value: 'Client', label: 'Client', bg: 'bg-zinc-700/40', text: 'text-zinc-400' },
];

function getRoleStyle(role: string) {
  return ALL_ROLES.find(r => r.value === role) || { bg: 'bg-zinc-700/40', text: 'text-zinc-400', label: role };
}

// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════

function RoleBadge(props: { role: string; class?: string }) {
  const style = getRoleStyle(props.role);
  return (
    <span class={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium', style.bg, style.text, props.class)}>
      {style.label}
    </span>
  );
}

function Avatar(props: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizes = { xs: 'w-5 h-5 text-[9px]', sm: 'w-6 h-6 text-[10px]', md: 'w-7 h-7 text-xs', lg: 'w-9 h-9 text-sm' };
  const colors = ['bg-blue-600', 'bg-violet-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];
  const ci = props.name ? props.name.charCodeAt(props.name.length - 1) % colors.length : 0;
  return (
    <div class={cn('rounded-full flex items-center justify-center font-semibold text-white shrink-0', sizes[props.size || 'md'], colors[ci])}>
      {props.name ? getInitials(props.name) : '?'}
    </div>
  );
}

function Btn(props: {
  children: any; onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg'; disabled?: boolean; class?: string;
}) {
  const v = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-600',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30',
  };
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-1.5 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button onClick={props.onClick} disabled={props.disabled}
      class={cn('inline-flex items-center gap-1.5 rounded font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed', v[props.variant || 'primary'], s[props.size || 'md'], props.class)}>
      {props.children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════

export default function UserView() {
  const params = useParams<{ id?: string }>();
  const userId = () => params.id ? Number(params.id) : null;
  const isProfileView = () => userId() !== null;

  // Fetch user data when viewing a specific profile
  const [profileUser] = createResource(userId, getInsiderUserById);

  const currentUser = () => session();
  const displayUser = () => isProfileView() ? profileUser() : currentUser();
  const userName = () => displayUser()?.name ?? 'Guest';
  const userEmail = () => displayUser()?.email ?? '';
  const userRole = () => displayUser()?.role ?? '';
  const userRoles = () => displayUser()?.roles || [];

  // Combine primary + additional roles uniquely
  const allRoles = () => {
    const set = new Set<string>([userRole(), ...userRoles()]);
    return [...set].filter(Boolean);
  };

  const [form, setForm] = createSignal({
    name: userName(),
    email: userEmail(),
    title: '',
    department: '',
    timezone: 'UTC',
  });

  const [saved, setSaved] = createSignal(false);

  const [notifPrefs, setNotifPrefs] = createSignal({
    assigned: true,
    review: true,
    approved: true,
    blocked: true,
    phaseReview: allRoles().some(r => r === 'Client' || r === 'Supervisor'),
    dueSoon: true,
  });

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-2xl mx-auto space-y-5">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-foreground text-white">
            {isProfileView() ? 'Profile' : 'Settings'}
          </h2>
          <p class="text-sm text-zinc-400 mt-0.5">
            {isProfileView() ? 'View user profile' : 'Manage your profile and preferences'}
          </p>
        </div>

        <Show when={!isProfileView() || profileUser()}>
          {/* Profile Card */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
            <div class="px-5 py-3 border-b border-[#1F1F23]">
              <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Profile</span>
            </div>
            <div class="p-5">
              <div class="flex items-center gap-4 mb-5">
                <Avatar name={userName()} size="lg" />
                <div>
                  <div class="text-sm font-semibold text-zinc-200">{userName()}</div>
                  <div class="text-xs text-zinc-500 mt-0.5">{userEmail()}</div>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <For each={allRoles()}>
                      {(role) => <RoleBadge role={role} />}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>

        <Show when={isProfileView() && profileUser.loading}>
          <div class="flex items-center gap-3 justify-center py-12 text-sm text-zinc-500">
            <span class="w-4 h-4 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
            Loading profile...
          </div>
        </Show>

        <Show when={isProfileView() && profileUser.error}>
          <div class="bg-[#121214] border border-red-500/20 rounded-lg p-5 text-center">
            <p class="text-sm text-red-400">User not found</p>
            <p class="text-xs text-zinc-500 mt-1">The user with ID {userId()} does not exist or has been removed.</p>
          </div>
        </Show>

        <Show when={!isProfileView() || (profileUser() && !profileUser.loading)}>
          {/* Editable fields */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
            <div class="px-5 py-3 border-b border-[#1F1F23]">
              <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Edit Profile</span>
            </div>
            <div class="p-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <For each={[
                  { label: 'Full Name', key: 'name' as const },
                  { label: 'Email', key: 'email' as const },
                  { label: 'Title', key: 'title' as const },
                  { label: 'Department', key: 'department' as const },
                  { label: 'Timezone', key: 'timezone' as const },
                ]}>
                  {({ label, key }) => (
                    <div class={key === 'email' ? 'md:col-span-2' : ''}>
                      <label class="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5">{label}</label>
                      <input
                        value={form()[key]}
                        onInput={e => setForm({ ...form(), [key]: e.currentTarget.value })}
                        class="w-full bg-zinc-800/50 border border-zinc-700/50 rounded text-sm text-zinc-200 px-3 py-2 outline-none focus:border-blue-500/60 transition-colors"
                      />
                    </div>
                  )}
                </For>
              </div>
              <div class="flex items-center gap-2 mt-4">
                <Btn variant="primary" size="md" onClick={save}>
                  {saved() ? <><CheckCheck size={13} />Saved!</> : 'Save Changes'}
                </Btn>
              </div>
            </div>
          </div>

          {/* Your Roles */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
            <div class="px-5 py-3 border-b border-[#1F1F23] flex items-center justify-between">
              <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Your Roles</span>
              <span class="text-[10px] text-zinc-600">{allRoles().length} role(s)</span>
            </div>
            <div class="p-4 space-y-2">
              <p class="text-xs text-zinc-400 mb-3">
                Your roles determine what actions you can perform across projects. Contact an admin to modify your roles.
              </p>
              <For each={ALL_ROLES}>
                {({ value, label, bg, text }: { value: string; label: string; bg: string; text: string; desc?: string }) => {
                  const active = allRoles().includes(value);
                  const descriptions: Record<string, string> = {
                    Supervisor: 'Full access — create projects, manage team',
                    QA: 'Approve & reject reviews',
                    Developer: 'Accept & submit tasks',
                    Client: 'Read-only + phase review',
                  };
                  return (
                    <div class={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded border transition-all',
                      active
                        ? 'bg-blue-600/5 border-blue-500/20'
                        : 'border-[#1F1F23] opacity-50'
                    )}>
                      <div class={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0', active ? 'bg-blue-600' : 'bg-zinc-700')}>
                        {active && <CheckCheck size={10} class="text-white" />}
                      </div>
                      <span class={cn('text-xs font-medium px-2 py-0.5 rounded', bg, text)}>{label}</span>
                      <span class="text-xs text-zinc-500 flex-1">{descriptions[value] || ''}</span>
                      {active && <span class="text-[10px] text-emerald-400 font-medium shrink-0">Active</span>}
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Notification Prefs */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
            <div class="px-5 py-3 border-b border-[#1F1F23]">
              <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Notifications</span>
            </div>
            <div class="p-4 space-y-3">
              <For each={[
                { label: 'Task assigned to me', key: 'assigned' as const },
                { label: 'Task submitted for review', key: 'review' as const },
                { label: 'Task approved / rejected', key: 'approved' as const },
                { label: 'Task blocked', key: 'blocked' as const },
                { label: 'Phase ready for client review', key: 'phaseReview' as const },
                { label: 'Due date reminders (2 days)', key: 'dueSoon' as const },
              ]}>
                {({ label, key }) => (
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-zinc-300">{label}</span>
                    <button
                      onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                      class={cn(
                        'w-9 h-5 rounded-full transition-all relative shrink-0',
                        notifPrefs()[key] ? 'bg-blue-600' : 'bg-zinc-700'
                      )}>
                      <span
                        class={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                          notifPrefs()[key] ? 'left-[18px]' : 'left-0.5'
                        )}
                      />
                    </button>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
