// ~/src/pages/UserView.tsx
import { createSignal, For, createResource } from 'solid-js';
import { session } from '../lib/store';
import { User, getAllUsers } from '../lib/fetch';
import { CheckCheck } from 'lucide-solid';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

type AppRole = 'Supervisor' | 'QA' | 'Developer' | 'Client';

function getRoleConfig(r: AppRole) {
  const m: Record<AppRole, { label: string; bg: string; text: string }> = {
    Supervisor: { label: 'Supervisor', bg: 'bg-violet-500/15', text: 'text-violet-400' },
    QA: { label: 'QA', bg: 'bg-amber-500/15', text: 'text-amber-400' },
    Developer: { label: 'Developer', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
    Client: { label: 'Client', bg: 'bg-zinc-700/40', text: 'text-zinc-400' },
  };
  return m[r];
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

// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════

function Badge(props: { children: any; class?: string }) {
  return (
    <span class={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide', props.class)}>
      {props.children}
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
  const currentUser = () => session();
  const userName = () => currentUser()?.name ?? 'Guest';
  const userRole = () => (currentUser()?.role as AppRole) || 'Client';
  const userRoles = () => currentUser()?.roles || [];

  const [form, setForm] = createSignal({
    name: userName(),
    email: '',
    title: '',
    department: '',
    timezone: 'UTC',
  });

  const [saved, setSaved] = createSignal(false);
  const [selectedRole, setSelectedRole] = createSignal<AppRole>(userRole());
  const [notifPrefs, setNotifPrefs] = createSignal({
    assigned: true,
    review: true,
    approved: true,
    blocked: true,
    phaseReview: userRoles().includes('Client') || userRoles().includes('Supervisor'),
    dueSoon: true,
  });

  const [allUsers] = createResource<User[]>(getAllUsers);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const switchRole = (role: AppRole) => {
    setSelectedRole(role);
    setNotifPrefs(p => ({
      ...p,
      phaseReview: role === 'Client' || role === 'Supervisor',
    }));
  };

  const roles: { role: AppRole; label: string; desc: string }[] = [
    { role: 'Supervisor', label: 'Supervisor', desc: 'Full access — create projects, manage team' },
    { role: 'QA', label: 'QA Engineer', desc: 'Approve & reject reviews' },
    { role: 'Developer', label: 'Developer', desc: 'Accept & submit tasks' },
    { role: 'Client', label: 'Client', desc: 'Read-only + phase review' },
  ];

  const displayName = () => {
    const switchedUser = allUsers()?.find(u => u.role === selectedRole());
    return switchedUser?.name ?? userName();
  };

  const roleConf = () => getRoleConfig(selectedRole());

  return (
    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-2xl mx-auto space-y-5">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-foreground text-white">Settings</h2>
          <p class="text-sm text-zinc-400 mt-0.5">Manage your profile and preferences</p>
        </div>

        {/* Profile */}
        <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
          <div class="px-5 py-3 border-b border-[#1F1F23]">
            <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Profile</span>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-4 mb-5">
              <Avatar name={displayName()} size="lg" />
              <div>
                <div class="text-sm font-semibold text-zinc-200">{displayName()}</div>
                <Badge class={cn(roleConf().bg, roleConf().text, 'mt-1')}>{roleConf().label}</Badge>
              </div>
            </div>
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

        {/* Demo Role Switcher */}
        <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
          <div class="px-5 py-3 border-b border-[#1F1F23] flex items-center justify-between">
            <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Demo: Switch Role</span>
            <Badge class="bg-amber-500/15 text-amber-400">Demo only</Badge>
          </div>
          <div class="p-4 space-y-2">
            <p class="text-xs text-zinc-400 mb-3">Switch perspective to explore role-based access control across the app.</p>
            <For each={roles}>
              {({ role, label, desc }) => {
                const conf = getRoleConfig(role);
                const active = selectedRole() === role;
                return (
                  <button onClick={() => switchRole(role)}
                    class={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded border text-left transition-all',
                      active
                        ? 'bg-blue-600/10 border-blue-500/40'
                        : 'border-[#1F1F23] hover:bg-zinc-800/40 hover:border-zinc-700/60'
                    )}>
                    <Badge class={cn(conf.bg, conf.text, 'shrink-0')}>{label}</Badge>
                    <span class="text-xs text-zinc-400">{desc}</span>
                    {active && <CheckCheck size={12} class="text-blue-400 ml-auto shrink-0" />}
                  </button>
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
      </div>
    </div>
  );
}
