from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    JoinWithUsernameView,
    PublicRoomListView,
    CreateRoomView,
    JoinRoomView,
    RoomDetailView,
    RoomStatusView,
    StartGameView,
    SubmitAnswerView,
    NextRoundView,
    LeaveRoomView,
    HealthCheckView,
)

urlpatterns = [
    # Auth endpoints
    path("auth/username/", JoinWithUsernameView.as_view(), name="join_with_username"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Room management
    path("rooms/", PublicRoomListView.as_view(), name="public_room_list"),
    path("rooms/create/", CreateRoomView.as_view(), name="create_room"),
    path("rooms/<str:code>/join/", JoinRoomView.as_view(), name="join_room"),
    path("rooms/<str:code>/detail/", RoomDetailView.as_view(), name="room_detail"),
    path("rooms/<str:code>/status/", RoomStatusView.as_view(), name="room_status"),
    path("rooms/<str:code>/leave/", LeaveRoomView.as_view(), name="leave_room"),
    # Game management
    path("rooms/<str:code>/start/", StartGameView.as_view(), name="start_game"),
    path("rooms/<str:code>/answer/", SubmitAnswerView.as_view(), name="submit_answer"),
    path("rooms/<str:code>/next-round/", NextRoundView.as_view(), name="next_round"),
    # Health check
    path("health/", HealthCheckView.as_view(), name="health_check"),
]
