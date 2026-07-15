// components/layout.js

import { ReactNode } from 'react'
import { Container, Flex } from '@chakra-ui/react'
import EnemyModal from './enemyTab/enemyModal';
import EquipModal from './equipModal';
import Navbar from './layout/navbar'
import Footer from './layout/footer';
import ScrollTop from './layout/scrollTop';
import GlobalLoader from './globalLoader';
interface Props {
  children: ReactNode
}

export default function Layout({children}: Props) {
  return (
    <>
      {/* min-h column so the footer sits at the viewport bottom on short pages */}
      <Flex direction="column" minH="100vh">
        <Navbar />
        <GlobalLoader />
        <EnemyModal/>
        <EquipModal/>
        <Container maxWidth={["container.sm", "container.sm", "container.md", "container.lg", "container.xl"]} mb={8} flex="1">{children}</Container>
        <Footer />
      </Flex>
      <ScrollTop />
    </>
  )
}