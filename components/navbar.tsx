import Link from 'next/link'
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

function CommonNavbar() {
  return (
    <Navbar bg="dark" variant="dark">
      <Container>
        <Navbar.Brand href="/">Home</Navbar.Brand>
        <Nav className="me-auto">
          <Nav.Link href="/enemies">Enemies</Nav.Link>
          <Nav.Link href="/world">World</Nav.Link>
          <Nav.Link href="/sanctum">Sanctum</Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  )
}

export default CommonNavbar