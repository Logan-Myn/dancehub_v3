"use client";

import { PrivateLesson } from "@/types/private-lessons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Percent } from "lucide-react";

interface PrivateLessonCardProps {
  lesson: PrivateLesson;
  communitySlug: string;
  isMember: boolean;
  onBook: (lessonId: string) => void;
}

export default function PrivateLessonCard({
  lesson,
  communitySlug,
  isMember,
  onBook,
}: PrivateLessonCardProps) {
  const displayPrice = isMember && lesson.member_price ? lesson.member_price : lesson.regular_price;
  const hasDiscount = isMember && lesson.member_price && lesson.member_price < lesson.regular_price;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getLocationIcon = () => {
    switch (lesson.location_type) {
      case 'online':
        return '💻';
      case 'in_person':
        return '🏢';
      case 'both':
        return '🌐';
      default:
        return '📍';
    }
  };

  const getLocationText = () => {
    switch (lesson.location_type) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'In Person';
      case 'both':
        return 'Online or In Person';
      default:
        return 'Location TBD';
    }
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold">{lesson.title}</CardTitle>
            {lesson.description && (
              <CardDescription className="mt-2 text-gray-600 dark:text-gray-300">
                {lesson.description}
              </CardDescription>
            )}
          </div>
          {hasDiscount && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Percent className="w-3 h-3 mr-1" />
              {lesson.member_discount_percentage}% off
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Duration and Location */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{lesson.duration_minutes} minutes</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{getLocationIcon()}</span>
            <span>{getLocationText()}</span>
          </div>
        </div>

        {/* Requirements */}
        {lesson.requirements && (
          <div className="text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Requirements: </span>
            <span className="text-gray-600 dark:text-gray-300">{lesson.requirements}</span>
          </div>
        )}

        {/* Max bookings info */}
        {lesson.max_bookings_per_month && (
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
            <Users className="w-4 h-4" />
            <span>Max {lesson.max_bookings_per_month} bookings per month</span>
          </div>
        )}

        {/* Pricing */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(displayPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                    {formatPrice(lesson.regular_price)}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {isMember ? (
                  hasDiscount ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✓ Member price
                    </span>
                  ) : (
                    <span>Member price</span>
                  )
                ) : (
                  <div>
                    <span>Non-member price</span>
                    {lesson.member_price && (
                      <div className="text-blue-600 dark:text-blue-400">
                        Members pay {formatPrice(lesson.member_price)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={() => onBook(lesson.id)}
          className="w-full"
          size="lg"
        >
          Book Lesson
        </Button>
      </CardFooter>
    </Card>
  );
} 