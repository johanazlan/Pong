import { interval, fromEvent, from, zip, Observable, Subscriber, merge, observable, ObjectUnsubscribedError, Subscription} from 'rxjs'
import { map, scan, filter,flatMap, take, concat, takeUntil} from 'rxjs/operators'

function pong() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  

  // get the svg canvas element
  const svg = document.getElementById("canvas")!;

  // create a paddle for the player
  const playerPaddle = document.createElementNS(svg.namespaceURI,'rect')
  Object.entries({
    x: 40, y: 250,
    width: 20, height: 60,
    fill: '#FFFFFF',
    }).forEach(([key,val])=> playerPaddle.setAttribute(key,String(val)))

  svg.appendChild(playerPaddle);

  //create a paddle for the cpu
  const cpuPaddle = document.createElementNS(svg.namespaceURI,'rect')
  Object.entries({
    x: 540, y: 250,
    width: 20, height: 60,
    fill: '#FFFFFF',
    }).forEach(([key,val])=> cpuPaddle.setAttribute(key,String(val)))

  svg.appendChild(cpuPaddle);

//Create the line in the middle
  const line = document.createElementNS(svg.namespaceURI,'line')
  Object.entries({
    x1: 290, x2: 290, 
    y1: 0, y2: 600,
    stroke: "#FFFFFF", 
    'stroke-width': 4,
    'stroke-dasharray': "5,5"
    }).forEach(([key,val])=> line.setAttribute(key,String(val)))

  svg.appendChild(line)


  //Create the ball
  const ball = document.createElementNS(svg.namespaceURI,'circle')
  Object.entries({
    cx: 290, cy: 290, //cx and cy are the x coord and y coord of the centre of the circle
    height: 15, width: 15,
    r: 10, fill: '#00FFFF',
    }).forEach(([key,val])=> ball.setAttribute(key,String(val)))

    svg.appendChild(ball);


  //Functions that are applied to the observable streams to make them move up or down.
  function moveRight(){return playerPaddle.setAttribute('y', String(Number(playerPaddle.getAttribute('y')) + 20))}
  function moveLeft(){return playerPaddle.setAttribute('y', String(Number(playerPaddle.getAttribute('y')) - 20))}

  //KeyDown Observable  
  const keyDown$ = fromEvent<KeyboardEvent>(document, 'keydown'); //An observable stream for keyDown events

  //A stream from the keyDown Observable to move down on the svg
  keyDown$
    .pipe(
      filter((e:KeyboardEvent) => e.keyCode === 68 || e.keyCode === 39)) //key D
    .subscribe(moveRight)

  //A stream from the keyDown Observable to move up on the svg 
  keyDown$
    .pipe(
      filter((e:KeyboardEvent) => e.keyCode === 65 || e.keyCode === 37)) //key A
    .subscribe(moveLeft)

////STREAM FOR MOVING BALL 

  let xVelocity = 1.5, //+ve means move right
      yVelocity = 1.5, //+ve means move down
      increaseSpeedX = 2, 
      decreaseSpeedX = 0.5

  //function to move the ball by changing the velocity
  function moveBall(){
    ball.setAttribute('cx', String(Number(ball.getAttribute('cx')) + ((-1)*xVelocity))) 
    ball.setAttribute('cy', String(Number(ball.getAttribute('cy')) + yVelocity))
  }


  const animation$ = interval(10) //Stream to move the ball
  animation$.subscribe(moveBall)


////STREAM FOR COLLISIONS 

  const collision$ = interval(10) //A stream of increasing numbers emitted every 'period' milliseconds
  collision$ //transform the stream so that the ball reflects when hits the top or bottom surface
    .pipe(
      map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), 
      r: Number(ball.getAttribute('r'))})), 
      filter(({x,y,r}) => (x+r < 600 || x-r > 0) && (y+r >= 600 || y-r <= 0)))
    .subscribe(() => {
      yVelocity = -yVelocity //when the ball hits the surface it reflects in the opp direction
      moveBall()
    }) 
  
  collision$ //Stream for collision with top part of playerPaddle
    .pipe(
      map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), playerPaddle})),
      filter(({x,y,r,playerPaddle}) => (x-r <= Number(playerPaddle.getAttribute('x')) + Number(playerPaddle.getAttribute('width'))) && 
      ((y-r >= Number(playerPaddle.getAttribute('y')) &&  y-r < Number(playerPaddle.getAttribute('y')) + (Number(playerPaddle.getAttribute('height')) / 2 )) 
      || (y+r >= Number(playerPaddle.getAttribute('y')) && y+r < Number(playerPaddle.getAttribute('y')) + (Number(playerPaddle.getAttribute('height')) / 2 )))) 
      )
    .subscribe(() => {
      xVelocity = -increaseSpeedX
      moveBall()
    })

  
  collision$ //Stream for collision with bottom part of playerPaddle
  .pipe(
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), playerPaddle})),
    filter(({x,y,r,playerPaddle}) => (x-r <= Number(playerPaddle.getAttribute('x')) + Number(playerPaddle.getAttribute('width'))) && 
    ((y-r > Number(playerPaddle.getAttribute('y')) + (Number(playerPaddle.getAttribute('height')) / 2) &&  y-r <= Number(playerPaddle.getAttribute('y')) + Number(playerPaddle.getAttribute('height'))) 
    || (y+r > Number(playerPaddle.getAttribute('y')) + (Number(playerPaddle.getAttribute('height')) / 2) && y+r <= Number(playerPaddle.getAttribute('y')) + Number(playerPaddle.getAttribute('height'))))) 
    )
    .subscribe(() => {
      xVelocity = -increaseSpeedX
      moveBall()
    })

  collision$ //Stream for collision with the middle of the playerPaddle
  .pipe(
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), playerPaddle})),
    filter(({x,y,r,playerPaddle}) => (x-r <= Number(playerPaddle.getAttribute('x')) + Number(playerPaddle.getAttribute('width'))) && 
    (y === Number(playerPaddle.getAttribute('y'))))
  )
  .subscribe(() => {
    xVelocity = -decreaseSpeedX
    moveBall()
  })



  collision$ //Stream for collision with top part of cpuPaddle
    .pipe(
      map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), cpuPaddle})),
      filter(({x,y,r,cpuPaddle}) => (x+r >= Number(cpuPaddle.getAttribute('x'))) && 
      ((y-r >= Number(cpuPaddle.getAttribute('y')) &&  y-r < Number(cpuPaddle.getAttribute('y')) + (Number(cpuPaddle.getAttribute('height')) / 2 )) 
      || (y+r >= Number(cpuPaddle.getAttribute('y')) && y+r < Number(cpuPaddle.getAttribute('y')) + (Number(cpuPaddle.getAttribute('height')) / 2 )))) 
      )
    .subscribe(() => {
      xVelocity = -xVelocity
      moveBall()
    })

  
  collision$ //Stream for collision with bottom part of cpuPaddle
  .pipe(
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), cpuPaddle})),
    filter(({x,y,r,cpuPaddle}) => (x+r >= Number(cpuPaddle.getAttribute('x'))) && 
    ((y-r > Number(cpuPaddle.getAttribute('y')) + (Number(cpuPaddle.getAttribute('height')) / 2) &&  y-r <= Number(cpuPaddle.getAttribute('y')) + Number(cpuPaddle.getAttribute('height'))) 
    || (y+r > Number(cpuPaddle.getAttribute('y')) + (Number(cpuPaddle.getAttribute('height')) / 2) && y+r <= Number(cpuPaddle.getAttribute('y')) + Number(cpuPaddle.getAttribute('height'))))) 
    )
    .subscribe(() => {
      xVelocity = -xVelocity
      moveBall()
    })

  collision$ //Stream for collision with the middle of the cpuPaddle
  .pipe(
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), cpuPaddle})),
    filter(({x,y,r,cpuPaddle}) => (x+r >= Number(cpuPaddle.getAttribute('x'))) && 
    (y === Number(cpuPaddle.getAttribute('y'))))
  )
  .subscribe(() => {
    xVelocity = -xVelocity
    moveBall()
  })


  const attr = (e: Element, o: any) => {for (const k in o) e.setAttribute(k, String(o[k])) } //attr is used to define attributes which are not predefined

  //initialise player score anc cpu score
  let playerScore = 0
  let cpuScore = 0

  //set the initial score for player
  const f = document.createElementNS(svg.namespaceURI, 'text')
  first(playerScore)

  //Updates the text content of the player 
  function first(playerScore: Number){
  f.textContent = String(playerScore)
  attr(f, {x: 250, y: 50, "font-size": "50px", fill: "#FFFFFF"})
  svg.appendChild(f)
  }
  
  //set the initial score for cpu
  const s = document.createElementNS(svg.namespaceURI, 'text')
  second(cpuScore)

  //updates the text content of the cpu
  function second(cpuScore: Number){
  s.textContent = String(cpuScore)
  attr(s, {x: 300, y: 50, "font-size": "50px", fill: "#FFFFFF"})
  svg.appendChild(s)
  }

  ///STREAM FOR PLAYER GETS A POINT 
  const point$ = interval(10)
  point$
  .pipe(
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r'))})),
    filter(({x,y,r}) => (x-r > 600 && y-r > 0 && y+r < 600 && playerScore < 7))) /// MUST INCLUDE "&& PLAYERSCORE <= 7" 
  .subscribe(() => {
    playerScore += 1 //update the player score
    first(playerScore)
    //reset ball and paddles. Then move the ball again
    ball.setAttribute('cx', '300') //place the paddle, ball in the original position
    ball.setAttribute('cy', '300')
    playerPaddle.setAttribute('x', '40')
    playerPaddle.setAttribute('y', '250')
    cpuPaddle.setAttribute('x', '540')
    cpuPaddle.setAttribute('y', '250')
    moveBall()

  })
  

  ///STREAM FOR CPU GETS A POINT 
  //collision$
  point$
  .pipe(
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r'))})),
    filter(({x,y,r}) => (x+r < 0 && y-r > 0 && y+r < 600 && cpuScore < 7))) /// MUST INCLUDE "&& CPUSCORE <= 7" 
  .subscribe(() => {
    cpuScore += 1 //update the cpu score
    second(cpuScore)
    //reset ball and paddles. Then move the ball again
    ball.setAttribute('cx', '300') //place the paddle, ball in the original position
    ball.setAttribute('cy', '300')
    playerPaddle.setAttribute('x', '40')
    playerPaddle.setAttribute('y', '250')
    cpuPaddle.setAttribute('x', '540')
    cpuPaddle.setAttribute('y', '250')
    moveBall()

  })


  ///STREAM FOR GAMEOVER and indicate winner
  const done$ = interval(10)
  done$.pipe(
    filter(() => (playerScore === 7 || cpuScore === 7))) /// MUST INCLUDE "&& CPUSCORE <= 7" 
  .subscribe(() => {
    if (playerScore === 7){ //check if player score reaches 7
      winner1() //player is the winner
    }

    else if (cpuScore === 7){ //check if player score reaches 7
      winner2() //cpu is the winner
    }
    
    end()
    finishGame()
  
  })

  //create a text for player if player wins
  function winner1(){ 
    const w = document.createElementNS(svg.namespaceURI, 'text')
    w.textContent = "Player Wins!"
    attr(w, {x: 200, y: 400, "font-size": "50px", fill: "#0000FF"})
    svg.appendChild(w)
    }

  //create a text for cpu if cpu wins
  function winner2(){
    const z = document.createElementNS(svg.namespaceURI, 'text')
    z.textContent = "CPU Wins!"
    attr(z, {x: 200, y: 400, "font-size": "50px", fill: "#0000FF"})
    svg.appendChild(z)
  }

//A function to reset the ball, paddles and scores on the svg
function finishGame(){

  ball.setAttribute('cx', '300') //place the paddle, ball in the original position
  ball.setAttribute('cy', '300')
  playerPaddle.setAttribute('x', '40')
  playerPaddle.setAttribute('y', '250')
  cpuPaddle.setAttribute('x', '540')
  cpuPaddle.setAttribute('y', '250')
  playerScore = 0
  first(playerScore)
  cpuScore = 0
  second(cpuScore)
  
}


////STREAM FOR MOVING CPU PADDLE

  //Moves the paddle down
  function movePaddleDown(){
    const yVelocity = 5
    cpuPaddle.setAttribute('x', String(Number(cpuPaddle.getAttribute('x'))))
    cpuPaddle.setAttribute('y', String(Number(cpuPaddle.getAttribute('y')) + yVelocity))
  }

  //Moves the paddle up
  function movePaddleUp(){
    const yVelocity = 5
    cpuPaddle.setAttribute('x', String(Number(cpuPaddle.getAttribute('x'))))
    cpuPaddle.setAttribute('y', String(Number(cpuPaddle.getAttribute('y')) - yVelocity))
  }

  const cpuAI$ = interval(10) //A stream for tracking the ball using cpu paddle
  cpuAI$.pipe( //A stream that tracks if ball lower than paddle
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), cpuPaddle})),
    filter(({x,y,r,cpuPaddle}) =>  (x + r < Number(cpuPaddle.getAttribute('x'))) && (y - r >= Number(cpuPaddle.getAttribute('y')) 
                                    + Number(cpuPaddle.getAttribute('height'))))
    )
    .subscribe(movePaddleDown)

  cpuAI$.pipe( //A stream that tracks if ball higher than paddle
    map(() => ({x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')), r: Number(ball.getAttribute('r')), cpuPaddle})),
    filter(({x,y,r,cpuPaddle}) => (x+r < Number(cpuPaddle.getAttribute('x'))) && (y+r <= Number(cpuPaddle.getAttribute('y'))))
    )
    .subscribe(movePaddleUp)
    
//end function is used to create the game over text and place it on the svg canvas
function end(){
  const v = document.createElementNS(svg.namespaceURI, "text")!; //Create the gameover text
    v.textContent = "Game Over";
    Object.entries({
    key: v.textContent, x: 100, y: 300,
    "font-size": "80px",
    fill: "#FF0000",
    }).forEach(([key,val])=> v.setAttribute(key,String(val)))
          
    svg.appendChild(v);
  }

  

}

  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }
  
  

