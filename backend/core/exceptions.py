from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


class BusinessRuleError(Exception):
    """Raised by service functions when a request breaks a Kazi Connect rule.

    Services stay independent of HTTP; the API turns this into a 400 response
    whose message tells the user how to fix the problem (UR-NF-07).
    """

    def __init__(self, message, code="business_rule"):
        super().__init__(message)
        self.message = message
        self.code = code


def api_exception_handler(exc, context):
    if isinstance(exc, BusinessRuleError):
        return Response({"detail": exc.message, "code": exc.code}, status=status.HTTP_400_BAD_REQUEST)
    return exception_handler(exc, context)
