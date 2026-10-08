export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  themeColor?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void | Promise<void>;
  onDismiss?: () => void;
  onFailure?: (error: any) => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function openMockRazorpayModal(opts: RazorpayCheckoutOptions): Promise<'success' | 'dismissed'> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200';
    overlay.id = 'mock-razorpay-modal';

    const formattedAmount = (opts.amount / 100).toFixed(2);

    overlay.innerHTML = `
      <div class="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl border border-border text-foreground space-y-4 font-sans animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">💳</span>
            <div class="text-left">
              <h3 class="font-bold text-sm tracking-tight">Razorpay Test Gateway</h3>
              <p class="text-[11px] text-muted-foreground">${opts.name} · ${opts.description}</p>
            </div>
          </div>
          <button id="mock-rzp-close" class="text-muted-foreground hover:text-foreground text-sm font-semibold p-1">✕</button>
        </div>

        <div class="rounded-xl bg-muted/50 p-3 text-center">
          <div class="text-xs text-muted-foreground">Amount to Pay</div>
          <div class="text-2xl font-bold font-mono text-foreground mt-0.5">₹${formattedAmount}</div>
          <div class="text-[11px] text-muted-foreground mt-1">ID: ${opts.orderId}</div>
        </div>

        <div class="space-y-2 pt-2">
          <button id="mock-rzp-success" class="w-full h-11 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm">
            <span>✓</span> Simulate Payment Success
          </button>
          <button id="mock-rzp-fail" class="w-full h-11 rounded-xl border border-danger/40 text-danger hover:bg-danger-soft font-semibold text-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2">
            <span>✕</span> Simulate Payment Failure
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    const successBtn = overlay.querySelector('#mock-rzp-success') as HTMLButtonElement;
    const failBtn = overlay.querySelector('#mock-rzp-fail') as HTMLButtonElement;
    const closeBtn = overlay.querySelector('#mock-rzp-close') as HTMLButtonElement;

    successBtn?.addEventListener('click', async () => {
      cleanup();
      const mockPaymentPayload: RazorpaySuccessResponse = {
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_order_id: opts.orderId,
        razorpay_signature: `sig_mock_${Math.random().toString(36).substring(2)}`,
      };
      await opts.onSuccess(mockPaymentPayload);
      resolve('success');
    });

    failBtn?.addEventListener('click', () => {
      cleanup();
      opts.onFailure?.({ code: 'PAYMENT_FAILED', description: 'Simulated payment failure by user' });
      opts.onDismiss?.();
      resolve('dismissed');
    });

    closeBtn?.addEventListener('click', () => {
      cleanup();
      opts.onDismiss?.();
      resolve('dismissed');
    });
  });
}

export async function openCheckout(opts: RazorpayCheckoutOptions): Promise<'success' | 'dismissed'> {
  const isMock = import.meta.env.VITE_USE_MOCKS === 'true';

  if (isMock) {
    return openMockRazorpayModal(opts);
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    // Never show the fake test gateway outside mock mode. A failed script load (offline, blocked)
    // must surface as an error, not as a "Simulate Payment Success" button.
    throw new Error("Couldn't load the payment page. Check your internet connection and try again.");
  }

  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amount,
      currency: opts.currency || 'INR',
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: opts.themeColor || '#F97316' },
      handler: async (response: RazorpaySuccessResponse) => {
        try {
          await opts.onSuccess(response);
          resolve('success');
        } catch {
          resolve('dismissed');
        }
      },
      modal: {
        ondismiss: () => {
          opts.onDismiss?.();
          resolve('dismissed');
        },
      },
    });

    rzp.on('payment.failed', (err: any) => {
      opts.onFailure?.(err);
    });

    rzp.open();
  });
}
