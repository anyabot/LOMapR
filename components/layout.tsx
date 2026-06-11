// components/layout.js

import { ReactNode } from 'react'
import { Container } from '@chakra-ui/react'
import EnemyModal from './enemyTab/enemyModal';
import Navbar from './layout/navbar'
import GlobalLoader from './globalLoader';
interface Props {
  children: ReactNode
}

export default function Layout({children}: Props) {
  return (
    <>
      <Navbar />
      <GlobalLoader />
      <EnemyModal/>
      <Container maxWidth={["container.sm", "container.sm", "container.md", "container.lg", "container.xl"]} mb={8}>{children}</Container>
    </>
  )
}