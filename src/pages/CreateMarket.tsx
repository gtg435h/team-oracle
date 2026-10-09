import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Info, Loader2, Plus } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Chip } from '@/components/market/Chip';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMarketActions } from '@/hooks/useMarketActions';
import { canCreateMarket } from '@/hooks/useMarketCreators';
import { toast } from '@/hooks/useToast';
import { formatDate, fromLocalInputValue, toLocalInputValue } from '@/lib/market/format';
import { cn } from '@/lib/utils';

const PRESET_TAGS = [
  'product',
  'revenue',
  'engineering',
  'hiring',
  'marketing',
  'ops',
  'finance',
  'culture',
] as const;

const LIQUIDITY_OPTIONS = [
  { value: '100', label: 'Shallow — prices move fast' },
  { value: '250', label: 'Standard — balanced' },
  { value: '500', label: 'Deep — needs real consensus' },
] as const;

const nowSeconds = () => Math.floor(Date.now() / 1000);

export default function CreateMarket() {
  useSeoMeta({
    title: 'Create a market — Team Oracle',
    description: 'Post a question for the team to forecast.',
  });

  const { user } = useCurrentUser();
  const creator = canCreateMarket(user?.pubkey);
  const { createMarket } = useMarketActions();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closeDateStr, setCloseDateStr] = useState(() => toLocalInputValue(nowSeconds() + 7 * 86400));
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [liquidity, setLiquidity] = useState('250');
  const [busy, setBusy] = useState(false);

  const closeDate = closeDateStr ? fromLocalInputValue(closeDateStr) : 0;
  const titleError =
    title.length > 0 && title.trim().length < 8 ? 'Give the question a bit more detail.' : null;
  const closeError = closeDate > 0 && closeDate <= nowSeconds() ? 'Close time must be in the future.' : null;
  const canSubmit = title.trim().length >= 8 && closeDate > nowSeconds() && !busy && tags.length <= 6;

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 6 ? prev : [...prev, tag],
    );
  }

  function addCustomTag() {
    const tag = customTag
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    if (!tag) return;
    setTags((prev) => (prev.includes(tag) || prev.length >= 6 ? prev : [...prev, tag]));
    setCustomTag('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { naddr } = await createMarket({
        title: title.trim(),
        description: description.trim(),
        tags,
        closeDate,
        liquidityB: Number(liquidity),
      });
      toast({ title: 'Market created', description: 'Share the link and let the forecasts begin.' });
      navigate(`/market/${naddr}`);
    } catch (err) {
      toast({
        title: 'Failed to create market',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  const gate = (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container flex flex-1 items-center justify-center py-16">
        <Card className="border-dashed">
          <CardContent className="px-8 py-12 text-center">
            <h1 className="font-display text-2xl font-bold">
              {!user ? 'Join to create markets' : 'Admins only'}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              {!user
                ? 'Market creation is limited to team leads. Log in with an authorised account to post questions.'
                : 'Only authorised team leads can post questions. Ask an admin to grant you market creation access from the Users page.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {!user && <LoginArea className="w-full [&>button]:w-full" />}
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/">Browse markets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );

  if (!user || !creator) return gate;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container flex-1 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create a market</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Write a crisp, verifiable question with a clear deadline. Good questions have an
          objective answer on the close date.
        </p>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <Card>
            <CardContent className="p-6">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Question <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                    placeholder="Will Project Falcon ship to production by Oct 31?"
                    aria-invalid={Boolean(titleError)}
                  />
                  <div className="flex justify-between text-xs">
                    <span className={cn(titleError ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                      {titleError ?? 'Keep it unambiguous and measurable.'}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{title.length}/200</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                    placeholder="Resolution criteria, links to dashboards, or anything traders should know…"
                    rows={4}
                  />
                  <div className="text-right text-xs text-muted-foreground tabular-nums">
                    {description.length}/2000
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="close-date">
                    Trading closes <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="close-date"
                    type="datetime-local"
                    value={closeDateStr}
                    min={toLocalInputValue(nowSeconds())}
                    onChange={(e) => setCloseDateStr(e.target.value)}
                    aria-invalid={Boolean(closeError)}
                  />
                  {closeError ? (
                    <span className="text-xs text-rose-600 dark:text-rose-400">{closeError}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      After this time the market awaits resolution.
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Market tags">
                    {PRESET_TAGS.map((t) => (
                      <button key={t} type="button" onClick={() => toggleTag(t)} aria-pressed={tags.includes(t)}>
                        <Chip
                          className={cn(
                            'cursor-pointer transition-colors',
                            tags.includes(t)
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {t}
                        </Chip>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomTag();
                        }
                      }}
                      placeholder="Add a custom tag…"
                      className="sm:max-w-64"
                      disabled={tags.length >= 6}
                    />
                    <Button type="button" variant="outline" onClick={addCustomTag} disabled={tags.length >= 6 || !customTag.trim()}>
                      Add
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">Up to 6 tags. {tags.length}/6 used.</span>
                </div>

                <div className="space-y-2">
                  <Label>Market depth</Label>
                  <Select value={liquidity} onValueChange={setLiquidity}>
                    <SelectTrigger className="w-full sm:max-w-96" aria-label="Market depth">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIQUIDITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    Deeper markets need more credits to move the price.
                  </span>
                </div>

                <Button type="submit" size="lg" className="w-full gap-2 font-semibold sm:w-auto sm:px-8" disabled={!canSubmit}>
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Publish market
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Open
                </Chip>
                <h3 className="text-lg font-semibold leading-snug">
                  {title.trim() || 'Will your question go here?'}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Chip key={t} className="border-border/80 bg-muted/60 text-muted-foreground">
                      {t}
                    </Chip>
                  ))}
                </div>
                <div>
                  <div className="font-display text-4xl font-bold tabular-nums leading-none">50¢</div>
                  <div className="mt-1 text-xs text-muted-foreground">chance of YES</div>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
                  <div className="w-1/2 bg-emerald-500" />
                  <div className="flex-1 bg-rose-400" />
                </div>
                <div className="mt-1.5 flex justify-between text-xs font-medium">
                  <span className="text-emerald-600 dark:text-emerald-400">YES 50¢</span>
                  <span className="text-rose-600 dark:text-rose-400">NO 50¢</span>
                </div>
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  {closeDate > 0 ? <>Closes {formatDate(closeDate)} · </> : null}
                  every market starts at 50/50
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>
                  You (and other admins) can resolve this market once the outcome is known. YES
                  pays 100¢ per share, NO pays 100¢ if the answer is no, void refunds 50¢ per share.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
