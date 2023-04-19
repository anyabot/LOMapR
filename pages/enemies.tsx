import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemy, selectEnemyStatus, fetchEnemyAsync, setActive } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect, useState } from 'react';
import { EnemyData } from '@/interfaces/enemy';
import { Button, ButtonGroup, Flex, InputGroup, Input, SimpleGrid } from '@chakra-ui/react'
import SimpleCard from '@/components/simpleCard';
import Head from 'next/head';

export default function Home() {

  const enemy = useAppSelector(selectEnemy);
  const enemyStatus = useAppSelector(selectEnemyStatus)
  const imagelink = useAppSelector(selectImage)

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync())
  }, [dispatch]);
  const [searchTerm, setSearchTerm] = useState("");
  const [checkFilterUsed, setFilterUsed] = useState(true);
  const [filterGroup, setFilterGroup] = useState({
    Light: true,
    Flying: true,
    Heavy: true,
    Attacker: true,
    Defender: true,
    Supporter: true,
  })
  
  function getImage(id:string) {
    return imagelink[id] ? imagelink[id] : undefined
  }
  function enemies(enemylist: {[key: string]: EnemyData}) {
    var render_enemies: EnemyData[] = [];
    var dupe: string[] = [];
    for (var key in enemylist) {
      var val = enemylist[key];
      if (!dupe.includes(val.name)) {
        if (filterUsed(val) && filterName(val) && filterButton(val)) {
          dupe.push(val.name);
          render_enemies.push(val);
        }
      }
    }
    return render_enemies;
  }
  function handleSwitch(e:keyof typeof filterGroup) {
    setFilterGroup({...filterGroup, [e]: !filterGroup[e]})
  }
  function filterButton(e: EnemyData) {
    if (e.role in filterGroup && e.type in filterGroup) 
    {
      return filterGroup[e.role as keyof typeof filterGroup] && filterGroup[e.type as keyof typeof filterGroup] 
    }
    return false
  }
  function filterName(e: EnemyData) {
    
    if (searchTerm) {
      return e.name.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  }
  function filterUsed(e: EnemyData) {
    
    if (checkFilterUsed) {
      return e.used ? Object.keys(e.used).length > 0 || e.usedSanctum : false
    }
    return true
  }
  if (enemyStatus == "failed"){
    return (<>
      <Head>
        <title>Enemy List</title>
      </Head>
      <h1>Fetch Failed</h1>
    </>)
  }
  if (Object.keys(enemy).length === 0) {
    return (<>
      <Head>
        <title>Enemy List</title>
      </Head>
      <h1>Loading</h1>
    </>)
  }
  else {
    return (
      <>
        <Head>
          <title>Enemy List</title>
        </Head>
        <Flex align="center" justify="center" direction={{ base: 'column', md: 'row' }}>
        <ButtonGroup isAttached m={[2, 3]}>
          <Button colorScheme='red' isActive={filterGroup.Attacker} onClick={e => handleSwitch("Attacker")}>Attacker</Button>
          <Button colorScheme='red' isActive={filterGroup.Defender} onClick={e => handleSwitch("Defender")}>Defender</Button>
          <Button colorScheme='red' isActive={filterGroup.Supporter} onClick={e => handleSwitch("Supporter")}>Supporter</Button>
        </ButtonGroup>
        <ButtonGroup isAttached m={[2, 3]}>
          <Button colorScheme='green' isActive={filterGroup.Light} onClick={e => handleSwitch("Light")}>Light</Button>
          <Button colorScheme='green' isActive={filterGroup.Flying} onClick={e => handleSwitch("Flying")}>Flying</Button>
          <Button colorScheme='green' isActive={filterGroup.Heavy} onClick={e => handleSwitch("Heavy")}>Heavy</Button>
        </ButtonGroup>
        <ButtonGroup isAttached m={[2, 3]}>
          <Button colorScheme='yellow' isActive={checkFilterUsed} onClick={e => setFilterUsed(!checkFilterUsed)}>Show Unused</Button>
        </ButtonGroup>
        </Flex>
        <InputGroup className="mb-3">
          <Input placeholder="Enemy Name" value={searchTerm} onInput={e => setSearchTerm((e.target as HTMLTextAreaElement).value)}/>
          <Button colorScheme='red' onClick={e => setSearchTerm("")}>Reset</Button>
        </InputGroup>
        <SimpleGrid columns={[2,3,4,6,7]} spacing={4}>
          {enemies(enemy).map(e => (<SimpleCard onClick={() => dispatch(setActive([e.id, 1]))} headingSize="sm" img={getImage(e.img)} key={e.id} alt={e.img}>{e.name}</SimpleCard>))}
        </SimpleGrid>
      </>
    )
  }
}
