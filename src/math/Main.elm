port module Main exposing (..)

import BigInt exposing (..)
import Platform exposing (..)

-- Bug. Needs to be imported
import Json.Decode exposing (..)



type alias Model =
    String




type Msg
    = ReceivedDataFromJS Model

port sendData : String -> Cmd msg

port receiveData : (Model -> msg) -> Sub msg

subscriptions : Model -> Sub Msg
subscriptions _ =
    receiveData ReceivedDataFromJS

-------------------------------------------------------------------------------------------------



type Expr a  = Const1 a 
        | Add1 (Expr a) (Expr a) 
        | Sub1 (Expr a) (Expr a) 
        | Mul1 (Expr a) (Expr a) 
        | Div1 (Expr a) (Expr a) 
         
type Res a = Numb a | Err String


applyOrErr : (number -> number -> number) -> Res number -> Res number -> Res number
applyOrErr f a b = case a of
    Err c -> Err c
    Numb c -> case b of
        Err d -> Err d
        Numb d -> Numb (f c d)


evalExpr : Expr number -> Res number
evalExpr c = case c of
    (Const1 a) -> Numb a 
    (Add1 a b) -> applyOrErr (+) (evalExpr a) (evalExpr b)
    (Sub1 a b) -> applyOrErr (-) (evalExpr a) (evalExpr b)
    (Mul1 a b) -> applyOrErr (*) (evalExpr a) (evalExpr b)
    (Div1 a b) -> if (evalExpr b) == (Numb 0)
                  then Err "Division by zero" 
                  else applyOrErr (/) (evalExpr a) (evalExpr b)






default0 : Maybe BigInt -> BigInt
default0 a =
    case a of 
        Just a -> a 
        Nothing -> BigInt.fromInt(1)

expo : BigInt -> BigInt
expo a = BigInt.pow a a



update : Msg -> Model -> ( Model, Cmd Msg )
update msg model = case msg of ReceivedDataFromJS data ->
            ( data, sendData <| Basics.toString <| evalExpr <| Mul1 (Const1 5) <| Add1 (Div1 (Const1 2) (Const1 4)) (Const1 3) 
            )
            
            --BigInt.fromString data |> default0 |> expo |> BigInt.toString |> sendData )


-------------------------------------------------------------------------------------------------
    
init : ( Model, Cmd Msg )
init = ( "", Cmd.none )


main : Program Never Model Msg
main = Platform.program
        { init = init
        , update = update
        , subscriptions = subscriptions
        }