from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Player, GameRoom, PlayerInRoom, GameRound, Question, PlayerAnswer
from .serializers import (
    RoomSerializer,
    PlayerAnswerSerializer,
    DetailedRoomSerializer,
    CreateRoomSerializer,
)
from django.shortcuts import get_object_or_404
from django.db.models import Count


class JoinWithUsernameView(APIView):
    """
    Creates a user account with just a username and returns JWT tokens
    """

    def post(self, request):
        username = request.data.get("username")
        if not username:
            return Response({"error": "Username is required."}, status=400)

        # Get or create a player with this username
        player, created = Player.objects.get_or_create(username=username)

        # Generate tokens
        refresh = RefreshToken.for_user(player)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "player_id": player.id,
                "username": player.username,
            }
        )


class PublicRoomListView(APIView):
    """
    List all available public game rooms
    """

    def get(self, request):
        # Get only public, active, and not started rooms
        rooms = GameRoom.objects.filter(
            is_private=False, is_active=True, started=False
        ).annotate(player_count=Count("players"))
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)


class CreateRoomView(APIView):
    """
    Create a new game room
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateRoomSerializer(data=request.data)
        if serializer.is_valid():
            # Create the room with the authenticated user as host
            room = serializer.save(host=request.user)

            # Automatically add host to the room
            PlayerInRoom.objects.create(room=room, player=request.user)

            return Response(
                {
                    "message": "Room created successfully",
                    "code": room.code,
                    "is_private": room.is_private,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JoinRoomView(APIView):
    """
    Join an existing game room
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        room = get_object_or_404(GameRoom, code=code)
        player = request.user

        # Check if the room has already started
        if room.started:
            return Response({"error": "Game has already started."}, status=400)

        # Prevent duplicate join
        if PlayerInRoom.objects.filter(room=room, player=player).exists():
            return Response({"message": "Already joined."})

        # Join the room
        PlayerInRoom.objects.create(room=room, player=player)
        return Response({"message": "Joined successfully."})


class RoomDetailView(APIView):
    """
    Get detailed information about a room
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        room = get_object_or_404(GameRoom, code=code)
        player = request.user

        # Check if the player is part of this room
        if not PlayerInRoom.objects.filter(room=room, player=player).exists():
            return Response({"error": "You are not part of this room."}, status=403)

        serializer = DetailedRoomSerializer(room)
        return Response(serializer.data)


class RoomStatusView(APIView):
    """
    Get current game status, including players and round information
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        room = get_object_or_404(GameRoom, code=code)
        player = request.user

        # Check if the player is part of this room
        if not PlayerInRoom.objects.filter(room=room, player=player).exists():
            return Response({"error": "You are not part of this room."}, status=403)

        # Get the current round if exists
        current_round = room.rounds.order_by("-round_number").first()

        # Build the response data
        data = {
            "started": room.started,
            "players": list(
                room.players.values("player__username", "score", "eliminated")
            ),
            "current_round": None,
        }

        # Add round data if game has started
        if room.started and current_round:
            data["current_round"] = {
                "number": current_round.round_number,
                "question": {
                    "text": current_round.question.text,
                    "options": {
                        "A": current_round.question.option_a,
                        "B": current_round.question.option_b,
                        "C": current_round.question.option_c,
                        "D": current_round.question.option_d,
                    },
                },
            }

            # Check if player has already answered
            player_in_room = PlayerInRoom.objects.get(room=room, player=player)
            player_answer = PlayerAnswer.objects.filter(
                player=player_in_room, round=current_round
            ).first()

            if player_answer:
                data["current_round"]["answered"] = True
                data["current_round"]["selected_option"] = player_answer.selected_option
            else:
                data["current_round"]["answered"] = False

        return Response(data)


class StartGameView(APIView):
    """
    Start the game (host only)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        room = get_object_or_404(GameRoom, code=code)
        player = request.user

        # Ensure only the host can start the game
        if room.host != player:
            return Response({"error": "Only the host can start the game."}, status=403)

        # Ensure minimum number of players
        if room.players.count() < 2:
            return Response(
                {"error": "At least 2 players required to start."}, status=400
            )

        # Check if already started
        if room.started:
            return Response({"error": "Game already started."}, status=400)

        # Start the game
        room.started = True
        room.save()

        # Start first round with a random question
        question = Question.objects.order_by("?").first()
        if not question:
            return Response(
                {"error": "No questions available in the database."}, status=500
            )

        GameRound.objects.create(room=room, question=question, round_number=1)

        return Response({"message": "Game started."})


class SubmitAnswerView(APIView):
    """
    Submit an answer for the current round
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        room = get_object_or_404(GameRoom, code=code)
        player = request.user

        # Get the player in this room
        try:
            player_room = PlayerInRoom.objects.get(room=room, player=player)
        except PlayerInRoom.DoesNotExist:
            return Response({"error": "You are not part of this room."}, status=403)

        # Check if player is eliminated
        if player_room.eliminated:
            return Response({"error": "You have been eliminated."}, status=403)

        # Get the current round
        current_round = room.rounds.order_by("-round_number").first()
        if not current_round:
            return Response({"error": "No active round found."}, status=400)

        # Check if already answered
        if PlayerAnswer.objects.filter(
            player=player_room, round=current_round
        ).exists():
            return Response(
                {"error": "You have already answered this question."}, status=400
            )

        # Validate and process the answer
        serializer = PlayerAnswerSerializer(data=request.data)
        if serializer.is_valid():
            selected_option = serializer.validated_data["selected_option"]
            is_correct = selected_option == current_round.question.correct_option

            # Create the answer record
            PlayerAnswer.objects.create(
                player=player_room,
                round=current_round,
                selected_option=selected_option,
                is_correct=is_correct,
            )

            # Update score if correct
            if is_correct:
                player_room.score += 1
                player_room.save()

            return Response(
                {
                    "correct": is_correct,
                    "correct_answer": current_round.question.correct_option,
                }
            )
        return Response(serializer.errors, status=400)


class NextRoundView(APIView):
    """
    Start the next round (host only)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        room = get_object_or_404(GameRoom, code=code)
        player = request.user

        # Ensure only the host can advance to next round
        if room.host != player:
            return Response(
                {"error": "Only the host can advance to the next round."}, status=403
            )

        # Check if game is started
        if not room.started:
            return Response({"error": "Game has not started yet."}, status=400)

        # Get the last round
        last_round = room.rounds.order_by("-round_number").first()
        if not last_round:
            return Response({"error": "No previous round found."}, status=400)

        # Create new round with next number
        next_round_number = last_round.round_number + 1

        # Get a random question that hasn't been used in this room yet
        used_question_ids = room.rounds.values_list("question_id", flat=True)
        new_question = (
            Question.objects.exclude(id__in=used_question_ids).order_by("?").first()
        )

        # If all questions have been used, just pick a random one
        if not new_question:
            new_question = Question.objects.order_by("?").first()

        # Create the new round
        GameRound.objects.create(
            room=room, question=new_question, round_number=next_round_number
        )

        return Response(
            {
                "message": f"Round {next_round_number} started.",
                "question": {
                    "text": new_question.text,
                    "options": {
                        "A": new_question.option_a,
                        "B": new_question.option_b,
                        "C": new_question.option_c,
                        "D": new_question.option_d,
                    },
                },
            }
        )


class LeaveRoomView(APIView):
    """
    Leave a game room
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        room = get_object_or_404(GameRoom, code=code)
        player = request.user

        # Check if player is in this room
        try:
            player_room = PlayerInRoom.objects.get(room=room, player=player)
        except PlayerInRoom.DoesNotExist:
            return Response({"error": "You are not in this room."}, status=404)

        # If player is host and game hasn't started, assign new host
        if room.host == player and not room.started:
            # Find another player to make host
            new_host = (
                PlayerInRoom.objects.filter(room=room).exclude(player=player).first()
            )
            if new_host:
                room.host = new_host.player
                room.save()
            else:
                # No other players, delete the room
                room.delete()
                return Response(
                    {"message": "Room deleted as you were the last player."}
                )

        # Delete player from room
        player_room.delete()

        return Response({"message": "Left the room successfully."})


class HealthCheckView(APIView):
    """
    Simple health check endpoint
    """

    def get(self, request):
        return Response({"success": True, "message": "server is running on v.0.1"})
