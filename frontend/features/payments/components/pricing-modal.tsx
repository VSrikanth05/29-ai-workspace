'use client';

import { Check, Crown, LoaderCircle, Sparkles, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface PlanInfo {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing: 'monthly' | 'yearly';
  features: string[];
  recommended?: boolean;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [keyId, setKeyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load Razorpay script
    if (!document.getElementById('razorpay-sdk')) {
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }

    // Fetch plans
    apiRequest<{ plans: PlanInfo[]; keyId: string; configured: boolean }>('/payments/plans')
      .then((data) => {
        setPlans(data.plans || []);
        setKeyId(data.keyId || '');
      })
      .catch(() => {
        // Fallback default plans
        setPlans([
          {
            id: 'free',
            name: 'Starter',
            price: 0,
            currency: 'INR',
            billing: 'monthly',
            features: [
              'Unlimited Grounded AI Chat (Gemini / NVIDIA NIM)',
              'Up to 20 Sources per Workspace',
              'AI Studio Deliverables & Flashcards',
              'Standard Image & Audio Generation',
            ],
          },
          {
            id: 'pro',
            name: 'Pro Workspace',
            price: 799,
            currency: 'INR',
            billing: 'monthly',
            recommended: true,
            features: [
              'Everything in Starter',
              'Unlimited Sources & Storage (Cloudflare R2)',
              'Priority LLM Routing & Failover',
              'High-Res Image Studio & Video Sequences',
              'Team Collaboration & Read-Only Sharing',
            ],
          },
          {
            id: 'team',
            name: 'Enterprise / Team',
            price: 2499,
            currency: 'INR',
            billing: 'monthly',
            features: [
              'Everything in Pro',
              'Dedicated Supabase DB & Custom Retention',
              'Custom Brand Theme & Custom Domain',
              'Audit Logs & SLA Support',
            ],
          },
        ]);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (plan: PlanInfo) => {
    if (plan.price === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const order = await apiRequest<{
        id: string;
        amount: number;
        currency: string;
        keyId: string;
        planId: string;
        mock?: boolean;
      }>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price * 100,
          currency: plan.currency,
        }),
      });

      if (order.mock || !window.Razorpay) {
        // Simulate immediate successful mock payment
        await apiRequest('/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            razorpayOrderId: order.id,
            razorpayPaymentId: 'pay_mock_' + Date.now(),
            razorpaySignature: 'sig_mock',
          }),
        });
        setPaymentSuccess(true);
        setTimeout(() => {
          setPaymentSuccess(false);
          onClose();
        }, 2000);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId || keyId,
        amount: order.amount,
        currency: order.currency,
        name: '29 AI Workspace',
        description: 'Upgrade to ' + plan.name,
        order_id: order.id,
        handler: async (response: any) => {
          await apiRequest('/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          setPaymentSuccess(true);
          setTimeout(() => {
            setPaymentSuccess(false);
            onClose();
          }, 2000);
        },
        theme: {
          color: '#2563eb',
        },
      });

      rzp.open();
    } catch (err: any) {
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-panel p-6 shadow-2xl md:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground"
          aria-label="Close pricing modal"
        >
          <X className="size-5" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Razorpay Seamless Checkout
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Upgrade Your AI Workspace
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scale your document intelligence with unlimited grounding, Cloudflare R2 storage, and priority routing.
          </p>
        </div>

        {paymentSuccess && (
          <div className="my-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-400">
            🎉 Payment successful! Your workspace has been upgraded.
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'relative flex cursor-pointer flex-col justify-between rounded-xl border p-5 transition-all',
                  plan.recommended
                    ? 'border-primary bg-primary/5 shadow-lg ring-1 ring-primary'
                    : 'border-border bg-surface/50 hover:border-border-hover',
                  isSelected && !plan.recommended && 'border-foreground/40 ring-1 ring-foreground/40',
                )}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    {plan.recommended ? (
                      <Crown className="size-4 text-primary" />
                    ) : (
                      <Zap className="size-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                      {plan.price === 0 ? 'Free' : '₹' + plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-xs text-muted-foreground">/month</span>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="size-3.5 shrink-0 text-primary mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckout(plan);
                    }}
                    disabled={loading}
                    variant={plan.recommended ? 'primary' : 'outline'}
                    className="w-full text-xs font-semibold"
                  >
                    {loading && selectedPlan === plan.id ? (
                      <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                    ) : null}
                    {plan.price === 0 ? 'Current Plan' : 'Upgrade to ' + plan.name}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          🔒 Payments secured with 256-bit encryption powered by Razorpay. Cancel anytime.
        </div>
      </div>
    </div>
  );
}
