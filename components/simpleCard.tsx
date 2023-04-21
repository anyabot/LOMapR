import { Image, Card, CardBody, Heading, Center, VStack } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface Props {
  img: string | undefined,
  alt: string,
  children: ReactNode,
  onClick? : React.MouseEventHandler,
  direction?: "row" | "column" | undefined,
  headingSize?: "sm" | "md" | "lg" | "xl" | "2xl" | "xs" | "3xl" | "4xl" | Array<"sm" | "md" | "lg" | "xl" | "2xl" | "xs" | "3xl" | "4xl"> | undefined
}

export default function SimpleCard({img, alt, children, onClick, direction, headingSize = "md"}: Props) {
  var boxsize
  if (direction === "row") {
    boxsize = ["100px", "150px", "200px", "250px", "300px"]
  }
  else if (direction === "column") {
    boxsize = "100%"
  }
  return (
    <Card bg="blackAlpha.900" color="whiteAlpha.800" onClick={onClick} cursor="pointer" direction={direction}>
        <Image
          src={img}
          alt={alt}
          borderRadius='lg'
          boxSize={boxsize}
        />
        <CardBody as={VStack}>
          <Heading size={headingSize ? headingSize : ["sm", "md", "md", "md", "md"]} textAlign="center">{children}</Heading>
        </CardBody>
    </Card>
  )
}