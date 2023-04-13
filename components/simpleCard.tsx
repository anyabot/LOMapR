import { Image, Card, CardBody, Heading, Center, VStack } from '@chakra-ui/react';

interface Props {
  img: string | undefined,
  alt: string,
  text: string,
  onClick? : React.MouseEventHandler,
  headingSize?: "sm" | "md" | "lg" | "xl" | "2xl" | "xs" | "3xl" | "4xl" | undefined
}

export default function SimpleCard({img, alt, text, onClick, headingSize = "md"}: Props) {
  return (
    <Card maxW='sm' bg="blackAlpha.900" color="whiteAlpha.800" onClick={onClick} cursor="pointer">
        <Image
          src={img}
          alt={alt}
          borderRadius='lg'
        />
        <CardBody as={VStack}>
          <Heading size={headingSize} textAlign="center">{text}</Heading>
        </CardBody>
    </Card>
  )
}