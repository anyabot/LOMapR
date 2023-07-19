import { Text, Image, Tooltip } from "@chakra-ui/react";

export default function EffectTooltip({
  label,
  count,
  e,
  type,
  icon
}: {
  label: string;
  count: number;
  e: string;
  type: string;
  icon: string
}) {
  let color = "gray"
  switch (type) {
    case "buff":
      color = "green"
      break
    case "debuff":
      color = "red"
      break
    case "normal":
      color = "blue"
      break
  }
  return (
    <Tooltip hasArrow label={label} bg="gray.300" color="black" key={count} shouldWrapChildren >
      <Text as="b" bg={`${color}.300`} p={0.5} rounded={6} display="flex" alignItems="center">
        <Image display="inline-block" src={`/images/effects/${icon}_Icon.webp`} boxSize="20px" verticalAlign="inherit"/>{e}
      </Text>
    </Tooltip>
  );
}
