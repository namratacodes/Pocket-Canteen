import React, { useState } from 'react';
import { Copy, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { copyText } from '../shared/copyText';

export interface RevealedCredentials {
  name: string;
  email: string;
  tempPassword: string;
  kind: 'created' | 'reset';
}

export interface CredentialRevealDialogProps {
  credentials: RevealedCredentials | null;
  /** Called when the admin is finished. The parent must clear the credentials from state. */
  onDone: () => void;
}

// The temporary password lives only in the parent's state and this dialog.
// It is never written to the query cache, storage or logs.
export const CredentialRevealDialog: React.FC<CredentialRevealDialogProps> = ({ credentials, onDone }) => {
  const [visible, setVisible] = useState(true);
  const [confirmClose, setConfirmClose] = useState(false);

  const finish = () => {
    setConfirmClose(false);
    setVisible(true);
    onDone();
  };

  return (
    <>
      <Dialog
        open={!!credentials}
        onOpenChange={(open) => {
          if (!open) setConfirmClose(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {credentials?.kind === 'reset' ? 'Password reset' : 'Staff account created'}
            </DialogTitle>
            <DialogDescription>
              Share these details with {credentials?.name ?? 'the staff member'} securely.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Login</p>
                  <p className="truncate font-mono font-medium">{credentials.email}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => copyText(credentials.email, 'Login')} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Temporary password</p>
                  <p className="truncate font-mono font-medium" data-testid="temp-password">
                    {visible ? credentials.tempPassword : '••••••••'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    onClick={() => setVisible((v) => !v)}
                  >
                    {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => copyText(credentials.tempPassword, 'Password')} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 rounded-xl bg-warning/15 p-3 text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  This password is shown only once. They will be asked to change it the first time they sign in.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {credentials && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  copyText(`Login: ${credentials.email}\nPassword: ${credentials.tempPassword}`, 'Login and password')
                }
              >
                Copy both
              </Button>
            )}
            <Button type="button" onClick={finish}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Did you copy the password?"
        description="It can't be shown again. If it's lost, reset the password to get a new one."
        confirmText="Yes, close"
        cancelText="Go back"
        onConfirm={finish}
      />
    </>
  );
};