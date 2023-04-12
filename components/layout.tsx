// components/layout.js

import { ReactNode } from 'react'
import { Container } from '@chakra-ui/react'
import EnemyModal from './enemyTab/enemyModal';
import Navbar from './layout/navbar'
interface Props {
  children: ReactNode
}

export default function Layout({children}: Props) {
  return (
    <>
      <Navbar />
      <EnemyModal/>
      <Container maxWidth={["container.sm", "container.sm", "container.md", "container.lg", "container.xl"]} mb={8}>{children}</Container>
    </>
  )
}