import { Image, Card, CardBody, Heading, Center, VStack } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface Props {
  img: string | undefined,
  alt: string,
  children: ReactNode,
  onClick? : React.MouseEventHandler,
  direction?: "row" | "column" | undefined,
  headingSize?: "sm" | "md" | "lg" | "xl" | "2xl" | "xs" | "3xl" | "4xl" | undefined
}

export default function SimpleCard({img, alt, children, onClick, direction, headingSize = "md"}: Props) {
  return (
    <Card bg="blackAlpha.900" color="whiteAlpha.800" onClick={onClick} cursor="pointer" direction={direction}>
        <Image
          src={img}
          alt={alt}
          borderRadius='lg'
        />
        <CardBody as={VStack}>
          <Heading size={headingSize} textAlign="center">{children}</Heading>
        </CardBody>
    </Card>
  )
}