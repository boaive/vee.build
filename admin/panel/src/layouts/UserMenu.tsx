import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useMe, useSignOut } from '@/api/hooks';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const initial = (me?.email ?? 'A').charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
          <Avatar className="size-7">
            <AvatarFallback className="data bg-primary text-[0.7rem] text-primary-foreground">{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="data truncate text-sm">{me?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate('/settings#security')}>
          <Settings className="size-4" /> Password and devices
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            signOut.mutate(undefined, {
              onSettled: () => {
                toast.success('Signed out');
                void navigate('/login', { replace: true });
              },
            })
          }
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
