import {
  Badge, Box, HStack, Image, SimpleGrid, Tab, TabList, TabPanel, TabPanels, Tabs, Text,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectItems, ItemMap } from '@/store/itemSlice';
import { RewardItem } from '@/components/rewardList';
import { selectUnit, fetchUnitsAsync } from '@/store/unitSlice';
import { unitDisplayName } from '@/lib/rank';
import { EventExchange, ExchangeProduct, RewardEntry } from '@/interfaces/world';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';

// Unit tickets resolve to the unit itself so the chip gets the unit hover card.
function entryOf(item: string, items: ItemMap): RewardEntry {
  const char = item.replace(/^CharTicket_/, '');
  return char !== item && items[char]?.kind === 'unit' ? { char } : { item };
}

function CurrencyIcon({ item, items, size }: { item: string; items: ItemMap; size: number }) {
  const info = items[item];
  return (
    <Image src={`/images/icons/${info?.icon || item}.png`} alt={info ? t(info.name) : item}
      title={info ? t(info.name) : item} boxSize={`${size}px`} objectFit="contain" flexShrink={0}
      fallbackStrategy="onError" fallback={<Box boxSize={`${size}px`} borderRadius="full" bg="whiteAlpha.300" />} />
  );
}

function limitText(p: ExchangeProduct): string {
  if (p.limit == null) return 'Unlimited';
  const n = p.limit.toLocaleString();
  return p.reset ? `${n} / ${p.reset}` : `Limit ${n}`;
}

function SkinChip({ p, items }: { p: ExchangeProduct; items: ItemMap }) {
  const skin = p.skin!;
  const dispatch = useAppDispatch();
  const unit = useAppSelector((s) => selectUnit(s, skin.unit));
  useEffect(() => { dispatch(fetchUnitsAsync()); }, [dispatch]);
  return (
    <HStack as={Link} href={`/units/detail?id=${encodeURIComponent(skin.unit)}&tab=skin`} spacing={2} pr={2.5}
      py={1} pl={1} borderWidth="1px" borderColor="surface.border" borderRadius="lg" bg="blackAlpha.300"
      _hover={{ borderColor: 'accent.400', bg: 'whiteAlpha.100' }}>
      <Image src={`/images/icons/${skin.icon}.png`} alt="" boxSize="48px" objectFit="contain" borderRadius="md"
        bg="blackAlpha.500" flexShrink={0} fallbackStrategy="onError"
        fallback={<Box boxSize="48px" borderRadius="md" bg="blackAlpha.500" flexShrink={0} />} />
      <Box minW={0}>
        <Text fontSize="sm" color="gray.100" noOfLines={1}>{items[p.item] ? t(items[p.item].name) : p.item}</Text>
        {unit ? <Text fontSize="xs" color="gray.400" noOfLines={1}>{unitDisplayName(unit)}</Text> : null}
      </Box>
    </HStack>
  );
}

function Product({ p, items }: { p: ExchangeProduct; items: ItemMap }) {
  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="lg" bg="blackAlpha.200" p={1.5}>
      {p.skin ? <SkinChip p={p} items={items} /> : <RewardItem entry={entryOf(p.item, items)} />}
      <HStack justify="space-between" mt={1.5} px={1} spacing={2} flexWrap="wrap">
        <HStack spacing={3}>
          {p.cost.map((c) => (
            <HStack key={c.item} spacing={1}>
              <CurrencyIcon item={c.item} items={items} size={20} />
              <Text fontSize="sm" fontWeight="bold" color="yellow.200">{c.count.toLocaleString()}</Text>
            </HStack>
          ))}
        </HStack>
        <Text fontSize="xs" color={p.limit == null ? 'gray.500' : 'gray.300'}>{limitText(p)}</Text>
      </HStack>
      {p.sell ? (
        <Text fontSize="2xs" color="gray.500" px={1} mt={0.5} noOfLines={1}>
          Sells for {items[p.sell] ? t(items[p.sell].name) : p.sell}
        </Text>
      ) : null}
      {p.start && p.end ? (
        <Text fontSize="2xs" color="gray.500" px={1} mt={0.5}>{p.start} – {p.end}</Text>
      ) : null}
    </Box>
  );
}

export function ShopGrid({ products, items }: { products: ExchangeProduct[]; items: ItemMap }) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={2}>
      {products.map((p, i) => <Product key={i} p={p} items={items} />)}
    </SimpleGrid>
  );
}

export default function EventExchangeView({ exchange }: { exchange: EventExchange }) {
  useTranslationVersion();
  const items = useAppSelector(selectItems);
  const { shops } = exchange;
  if (shops.length === 1) return <ShopGrid products={shops[0].items} items={items} />;
  return (
    <Tabs variant="soft-rounded" colorScheme="accent" isLazy>
      <TabList flexWrap="wrap" gap={1} mb={2}>
        {shops.map((s) => (
          <Tab key={s.currency} px={3} py={1.5} fontSize="sm">
            <HStack spacing={1.5}>
              <CurrencyIcon item={s.currency} items={items} size={20} />
              <Text noOfLines={1}>{items[s.currency] ? t(items[s.currency].name) : s.currency}</Text>
              <Badge borderRadius="full" fontSize="0.65rem">{s.items.length}</Badge>
            </HStack>
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {shops.map((s) => (
          <TabPanel key={s.currency} px={0}>
            <ShopGrid products={s.items} items={items} />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}
